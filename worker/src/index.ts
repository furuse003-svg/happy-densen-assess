/**
 * ハッピーデンセン AI自動査定 — Cloudflare Worker
 *
 *  POST /api/classify  { image: <base64>, media_type: "image/jpeg" }
 *        → { category: "hachi"|"roku"|"f"|"unknown", confidence: 0..1, reason: string, is_cable: boolean, subject: "cable"|"bald_head"|"other" }
 *        Claude (vision) で 8割銅線 / 6割銅線 / Fケーブル を判別する
 *
 *  GET  /api/prices
 *        → { prices: { hachi, roku, f }, updated: "YYYY-MM-DD", source: url }
 *        colors.main.jp の「被覆銅線買取価格」から単価を抽出（6時間キャッシュ）
 */
import Anthropic from "@anthropic-ai/sdk";

export interface Env {
  ANTHROPIC_API_KEY: string;
  ALLOWED_ORIGINS?: string; // カンマ区切り。未設定または "*" で全許可
  PRICE_SOURCE_URL?: string;
  MODEL?: string;
}

type Category = "hachi" | "roku" | "f" | "unknown";
type Subject = "cable" | "bald_head" | "other";

interface ClassifyResult {
  category: Category;
  confidence: number;
  reason: string;
  is_cable: boolean;
  subject: Subject; // 電線以外のときの被写体（bald_head = 人のハゲ頭・スキンヘッド → 「それは中村だ！」演出）
}

const ALLOWED_MEDIA = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // base64長で概算

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    category: { type: "string", enum: ["hachi", "roku", "f", "unknown"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    reason: { type: "string" },
    is_cable: { type: "boolean" },
    subject: { type: "string", enum: ["cable", "bald_head", "other"] },
  },
  required: ["category", "confidence", "reason", "is_cable", "subject"],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `あなたは札幌の電線・銅スクラップ買取店「ハッピーデンセン」のベテラン鑑定スタッフです。
お客様が送ってきた被覆銅線（電線）の写真を見て、買取区分を1つ判定します。

■ 買取区分
- hachi = 8割銅線: 黒色の被覆。断面で見たとき銅（導体）が占める割合が高い（おおよそ70〜85%）。CVケーブル・IV線など導体が太く被覆が薄いもの。切り口の銅の円が大きく、被覆の黒い縁が細い。
- roku = 6割銅線: 黒色の被覆。断面の銅の割合が中程度（おおよそ50〜65%）。被覆が厚め、または導体が細めで、切り口の黒い縁が太く見える。
- f = Fケーブル（VA線 / VVF）: 灰色（グレー）の平たい（楕円・長方形断面）ケーブル。中に白・黒・赤などの絶縁された芯線が2〜3本入っている。色が灰色なら基本これ。
- unknown = 電線ではない、または上記のどれとも判断できない。

■ 判定手順
1. まず被覆の色を見る。灰色の平型ケーブル → f。
2. 黒色なら断面（切り口）を探し、銅の面積比で hachi か roku を決める。断面が写っていない場合は導体の太さや被覆の厚みから推定し、confidence を下げる。
3. 複数種類が混ざっている場合は、写真の中で量が最も多いものを選ぶ。
4. 電線が写っていない・判別不能なら unknown。

■ subject（被写体）
- cable = 電線が写っている（判別できなくても電線ならこれ）。
- bald_head = 電線ではなく、頭髪の無い頭（ハゲ頭・スキンヘッド・剃った頭・薄毛の頭頂部）が主な被写体。顔全体が写っていても頭髪が無い／少ない人ならこれ。実写でもアニメ・イラスト・人形でもよく、肌色でない（白塗り・青白い等）顔でも、帽子をかぶっていて髪が見えなくても、ハゲ頭のキャラクターならこれ。
- other = 電線でも頭でもない（風景・食べ物・他の物など）。
category が unknown で電線でない場合は必ず bald_head か other を選ぶ。

■ 出力
- confidence は 0〜1。断面が明瞭なら高く、断面が写っていない・暗い・遠いなら低くする。
- reason はお客様向けに日本語で60文字以内、丁寧かつ簡潔に。何を根拠に判定したかを書く（例：「灰色の平型ケーブルで、白・黒の芯線が見えるためFケーブルと判定しました」）。`;

const USER_PROMPT = "この電線の写真を判定してください。";

function corsHeaders(req: Request, env: Env): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "*").split(",").map((s) => s.trim()).filter(Boolean);
  const allowOrigin = allowed.includes("*") ? "*" : allowed.includes(origin) ? origin : allowed[0] || "";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...extra },
  });
}

async function classify(env: Env, image: string, mediaType: string): Promise<ClassifyResult> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const model = env.MODEL || "claude-opus-5";

  const response = await client.beta.messages.create({
    model,
    max_tokens: 1024,
    // 安全分類器が画像を拒否した場合に別モデルへ自動フォールバック
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM_PROMPT,
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: OUTPUT_SCHEMA },
    },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
              data: image,
            },
          },
          { type: "text", text: USER_PROMPT },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    return { category: "unknown", confidence: 0, reason: "この画像は判定できませんでした。別の写真でお試しください。", is_cable: false, subject: "other" };
  }

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("no text block in response");

  const parsed = JSON.parse(text.text) as ClassifyResult;
  const category: Category = (["hachi", "roku", "f", "unknown"] as Category[]).includes(parsed.category) ? parsed.category : "unknown";
  return {
    category,
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)),
    reason: String(parsed.reason || "").slice(0, 120),
    is_cable: Boolean(parsed.is_cable),
    subject: (["cable", "bald_head", "other"] as Subject[]).includes(parsed.subject) ? parsed.subject : parsed.is_cable ? "cable" : "other",
  };
}

/* ---------------- 価格取得 ---------------- */
const NAME_MAP: Array<[RegExp, keyof PriceSet]> = [
  [/8\s*割\s*銅線/, "hachi"],
  [/6\s*割\s*銅線/, "roku"],
  [/F\s*ケーブル|VA\s*線|VVF/i, "f"],
];
interface PriceSet { hachi?: number; roku?: number; f?: number }

function parsePrices(html: string): PriceSet {
  const out: PriceSet = {};
  // <h4> 名称 <span class="upicon">更新</span></h4> <p> ■買取価格…<b><font ...>1,660</font>円/kg
  const re = /<h4>\s*([^<]+?)\s*(?:<span[^>]*>[^<]*<\/span>)?\s*<\/h4>[\s\S]{0,400}?<font[^>]*>\s*([\d,]+)\s*<\/font>\s*円/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const name = m[1].trim();
    const price = parseInt(m[2].replace(/,/g, ""), 10);
    if (!price) continue;
    for (const [rx, key] of NAME_MAP) {
      if (rx.test(name) && out[key] === undefined) out[key] = price;
    }
  }
  return out;
}

async function getPrices(env: Env, req: Request): Promise<Response> {
  const source = env.PRICE_SOURCE_URL || "https://colors.main.jp/";
  const cache = caches.default;
  const cacheKey = new Request(new URL(req.url).origin + "/api/prices", { method: "GET" });
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const res = await fetch(source, { headers: { "User-Agent": "HappyDensenPriceBot/1.0" } });
  if (!res.ok) return json({ error: "price source unavailable", status: res.status }, 502);
  const html = await res.text();
  const prices = parsePrices(html);
  if (prices.hachi === undefined && prices.roku === undefined && prices.f === undefined) {
    return json({ error: "could not parse prices" }, 502);
  }
  const body = json(
    { prices, updated: new Date().toISOString().slice(0, 10), source },
    200,
    { "Cache-Control": "public, max-age=21600" },
  );
  await cache.put(cacheKey, body.clone());
  return body;
}

/* ---------------- ルーティング ---------------- */
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(req, env);
    const url = new URL(req.url);

    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    if (url.pathname === "/api/prices" && req.method === "GET") {
      const r = await getPrices(env, req);
      const h = new Headers(r.headers);
      Object.entries(cors).forEach(([k, v]) => h.set(k, v));
      return new Response(r.body, { status: r.status, headers: h });
    }

    if (url.pathname === "/api/classify" && req.method === "POST") {
      if (!env.ANTHROPIC_API_KEY) return json({ error: "ANTHROPIC_API_KEY is not configured" }, 500, cors);
      let body: { image?: string; media_type?: string };
      try {
        body = await req.json();
      } catch {
        return json({ error: "invalid JSON" }, 400, cors);
      }
      const image = (body.image || "").replace(/^data:[^;]+;base64,/, "");
      const mediaType = body.media_type || "image/jpeg";
      if (!image) return json({ error: "image is required" }, 400, cors);
      if (!ALLOWED_MEDIA.has(mediaType)) return json({ error: "unsupported media_type" }, 400, cors);
      if (image.length > MAX_IMAGE_BYTES * 1.37) return json({ error: "image too large (max 5MB)" }, 413, cors);

      try {
        const result = await classify(env, image, mediaType);
        return json(result, 200, cors);
      } catch (err) {
        // 具体的なクラスから順に判定（APIConnectionError は APIError のサブクラスなので先に）
        if (err instanceof Anthropic.RateLimitError) return json({ error: "rate limited, retry later" }, 429, cors);
        if (err instanceof Anthropic.APIConnectionError) return json({ error: "upstream connection error" }, 502, cors);
        if (err instanceof Anthropic.APIError) return json({ error: `upstream ${err.status ?? "error"}` }, 502, cors);
        console.error(err);
        return json({ error: "classification failed" }, 500, cors);
      }
    }

    if (url.pathname === "/" || url.pathname === "/health") {
      return json({ ok: true, endpoints: ["POST /api/classify", "GET /api/prices"] }, 200, cors);
    }
    return json({ error: "not found" }, 404, cors);
  },
};
