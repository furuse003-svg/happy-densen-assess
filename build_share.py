#!/usr/bin/env python3
"""共有用の単一HTML（dist/happy-assess-share.html）を生成する。

assess/ の config.js / style.css / embed.js / img/ と test-fixtures/ のサンプル写真を
すべて data URI で1ファイルに埋め込む。Claude アーティファクトや任意の静的ホスティングに
そのまま置ける。再生成: python3 build_share.py
"""
import base64, io, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent
A = ROOT / "assess"
OUT = ROOT / "dist" / "happy-assess-share.html"   # アーティファクト用（doctype無しの断片）
OUT_PAGE = ROOT / "index.html"                        # GitHub Pages 用（完全なHTML文書）


def data_uri(path: pathlib.Path, mime: str) -> str:
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()


def jpeg_data_uri(path: pathlib.Path, max_w: int = 1024, quality: int = 80) -> str:
    """サンプル写真は少し縮小して埋め込む（PILが無ければそのまま）。"""
    try:
        from PIL import Image
        im = Image.open(path).convert("RGB")
        if im.width > max_w:
            im = im.resize((max_w, round(im.height * max_w / im.width)))
        buf = io.BytesIO()
        im.save(buf, "JPEG", quality=quality, optimize=True)
        return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()
    except ImportError:
        return data_uri(path, "image/jpeg")


config_js = (A / "config.js").read_text(encoding="utf-8")
style_css = (A / "style.css").read_text(encoding="utf-8")
embed_js = (A / "embed.js").read_text(encoding="utf-8")

# 画像を data URI に（img/ 直下と digits/ サブフォルダ）。JS 側は asset(name) で window.HAPPY_ASSETS を参照する
assets = {}
for p_ in sorted((A / "img").rglob("*")):
    if p_.suffix.lower() in (".png", ".jpg", ".jpeg"):
        rel = p_.relative_to(A / "img").as_posix()
        assets[rel] = data_uri(p_, "image/jpeg" if p_.suffix.lower() in (".jpg", ".jpeg") else "image/png")
import json
assets_js = "window.HAPPY_ASSETS = " + json.dumps(assets) + ";"
# CSS内の背景画像参照も data URI に
for name, uri in assets.items():
    style_css = style_css.replace(f'url("img/{name}")', f'url("{uri}")')
# インライン<script>内で終了タグと誤認されないようにエスケープ（コメント内の記述）
embed_js = embed_js.replace("</script>", "<\\/script>")
# インラインCSS/設定を使うので外部読み込みをスキップ
embed_js = embed_js.replace("document.querySelector('link[data-hda-css]')", "document.querySelector('[data-hda-css]')")

samples = [
    ("8wari_cv_single.jpg", "8割銅線", "黒い単心CVケーブル・断面あり"),
    ("6wari_cv_multi.jpg", "6割銅線", "黒い多心CVケーブル"),
    ("f_cable_vvf.jpg", "Fケーブル", "灰色のVVF"),
]
sample_uris = {n: jpeg_data_uri(ROOT / "test-fixtures" / n) for n, _, _ in samples}
m = re.search(r'pricesUpdated:\s*"([^"]+)"', config_js)
updated = m.group(1) if m else "最新"

sample_buttons = "\n".join(
    f'        <button type="button" class="sample" data-sample="{n}"><img src="{sample_uris[n]}" alt=""><span><b>{label}</b><small>{desc}</small></span></button>'
    for n, label, desc in samples
)

html = f"""<title>ハッピーデンセン AI査定デモ</title>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="写真からAIが電線の種類を判別し、重量を入れるとスロット演出で買取概算を表示する埋め込みウィジェットのデモ">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Jost:ital,wght@0,500;0,700;0,800;1,800&family=Noto+Sans+JP:wght@400;500;700;900&display=swap" rel="stylesheet">
<style>
  :root {{ color-scheme: dark; --bg: #05080f; --ink: #ffffff; --muted: #c9d2e3; --pink: #ff2d95; --navy: #ffd400; --card: #101a30; --line: #2b3a57; }}
  html, body {{ margin: 0; background: var(--bg); color: var(--ink); font-family: "Noto Sans JP", "Hiragino Sans", sans-serif; font-size: 14px; line-height: 1.7; }}
  .page {{ max-width: 840px; box-sizing: border-box; margin: 0 auto; padding: 20px 16px 48px; }}
  @media (min-width: 560px) {{ .page {{ padding: 32px 20px 64px; }} }}
  .intro {{ display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }}
  .intro__badge {{ display: inline-block; padding: 3px 10px; border-radius: 999px; background: var(--navy); color: #1a1a1a; font-family: Jost, sans-serif; font-weight: 700; font-size: 11px; letter-spacing: .14em; }}
  .intro h1 {{ margin: 6px 0 0; font-size: 20px; font-weight: 900; letter-spacing: .02em; text-wrap: balance; }}
  .intro p {{ margin: 2px 0 0; color: var(--muted); font-size: 12px; }}
  .samples {{ margin: 0 0 12px; padding: 12px 14px 14px; border-radius: 14px; background: var(--card); border: 1px solid var(--line); }}
  .samples h2 {{ margin: 0 0 8px; font-size: 13px; font-weight: 700; color: var(--navy); }}
  .samples h2 small {{ margin-left: 6px; color: var(--muted); font-weight: 500; }}
  .samples__row {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }}
  .sample {{ display: grid; grid-template-rows: auto auto; gap: 6px; margin: 0; padding: 6px; border: 2px solid var(--line); border-radius: 10px; background: #0b1220; text-align: left; cursor: pointer; font-family: inherit; transition: border-color .15s, transform .1s; }}
  .sample:hover, .sample:focus-visible {{ border-color: var(--pink); outline: none; }}
  .sample:active {{ transform: scale(.98); }}
  .sample img {{ display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 6px; }}
  .sample span {{ display: grid; line-height: 1.35; }}
  .sample b {{ font-size: 13px; color: var(--ink); }}
  .sample small {{ font-size: 10px; color: var(--muted); }}
  .note {{ margin: 18px 0 0; padding: 14px 16px; border-radius: 12px; background: var(--card); border: 1px solid var(--line); color: var(--muted); font-size: 12px; }}
  .note h2 {{ margin: 0 0 6px; font-size: 13px; color: var(--ink); }}
  .note ul {{ margin: 0; padding-left: 18px; }}
  .note li + li {{ margin-top: 3px; }}
  .note code {{ font-family: Jost, ui-monospace, monospace; font-size: 12px; color: var(--navy); }}
  .toast-anchor {{ position: relative; }}
</style>
<style data-hda-css>
{style_css}
</style>
<script>
{config_js}
{assets_js}
</script>

<div class="page">
  <header class="intro">
    <div>
      <span class="intro__badge">DEMO</span>
      <h1>写真でかんたん！AI自動査定</h1>
      <p>ハッピーデンセン公式サイトに埋め込むウィジェットの動作確認用ページです。</p>
    </div>
  </header>

  <section class="samples" aria-label="サンプル写真">
    <h2>写真がない方はサンプルで試す<small>タップすると下のウィジェットに読み込まれます</small></h2>
    <div class="samples__row">
{sample_buttons}
    </div>
  </section>

  <div id="happy-assess"></div>

  <section class="note">
    <h2>このデモについて</h2>
    <ul>
      <li>判定は現在、AIサーバー未接続のため「簡易判定」（写真の色と断面の形から推定）で動いています。結果はタップで修正できます。</li>
      <li>金額は「店頭単価 × 重量」の概算です（単価は{updated}時点）。</li>
      <li>ネオンサイン「ハッピー価格」の点灯とサムズアップ中村の登場は約1/3の確率の演出で、金額には影響しません。URL末尾に <code>?happy=1</code> を付けると必ず点灯します。</li>
      <li>効果音は右上の 🔇 で ON にできます。表示は幅1120pxのデザインを画面幅に合わせて縮小しています。</li>
    </ul>
  </section>
</div>

<script>
{embed_js}
</script>
<script>
(() => {{
  // サンプル写真 → ウィジェットのファイル入力へ流し込む
  const b64ToFile = (uri, name) => {{
    const [meta, data] = uri.split(",");
    const mime = meta.match(/data:([^;]+)/)[1];
    const bin = atob(data); const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new File([arr], name, {{ type: mime }});
  }};
  document.querySelectorAll(".sample").forEach((btn) => {{
    btn.addEventListener("click", () => {{
      const root = document.getElementById("happy-assess");
      const input = root.querySelector('[data-el="file"]');
      if (!input) return;
      // 査定前の画面でなければ最初に戻す（再現版は data-screen、旧版は data-step）
      const retake = root.querySelector('[data-el="retake"]') || root.querySelector('[data-el="again"]');
      const uploadScreen = root.querySelector('.hda-screen[data-screen="upload"]');
      const step1 = root.querySelector('.hda-panel[data-step="1"]');
      if ((uploadScreen && uploadScreen.hidden) || (step1 && !step1.classList.contains("is-active"))) retake && retake.click();
      const file = b64ToFile(btn.querySelector("img").src, btn.dataset.sample);
      const dt = new DataTransfer(); dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event("change", {{ bubbles: true }}));
      setTimeout(() => {{ const c = root.querySelector('[data-el="classify"]'); if (c) c.scrollIntoView({{ behavior: "smooth", block: "center" }}); }}, 250);
    }});
  }});
}})();
</script>
"""

OUT.parent.mkdir(exist_ok=True)
OUT.write_text(html, encoding="utf-8")
print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size / 1024:.0f} KB)")
page = '<!DOCTYPE html>\n<html lang="ja">\n<head>\n' + html.split("\n<div class=\"page\">")[0] + '\n</head>\n<body>\n<div class="page">' + html.split("\n<div class=\"page\">", 1)[1] + '\n</body>\n</html>\n'
OUT_PAGE.write_text(page, encoding="utf-8")
print(f"wrote {OUT_PAGE.relative_to(ROOT)} ({OUT_PAGE.stat().st_size / 1024:.0f} KB)")
