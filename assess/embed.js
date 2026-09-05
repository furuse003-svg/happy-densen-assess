/* =====================================================================
 * ハッピーデンセン AI自動査定ウィジェット — 埋め込みスクリプト
 *
 *   <div id="happy-assess"></div>
 *   <script src="https://lp.used-cable.net/assess/embed.js" defer></script>
 *
 * だけでLPのどこにでも差し込めます。style.css / config.js / img/ は
 * embed.js と同じフォルダから自動で読み込みます。
 * ===================================================================== */
(() => {
  "use strict";

  const SCRIPT = document.currentScript;
  const BASE = SCRIPT && SCRIPT.src ? SCRIPT.src.replace(/[^/]*$/, "") : "";
  const IMG = BASE + "img/";

  /* ---------------- 依存の読み込み ---------------- */
  function loadCss() {
    if (document.querySelector('link[data-hda-css]')) return;
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = BASE + "style.css";
    l.dataset.hdaCss = "1";
    document.head.appendChild(l);
  }
  function loadFonts() {
    const has = Array.from(document.querySelectorAll('link[rel=stylesheet]')).some((l) => /fonts\.googleapis\.com.*Jost/.test(l.href));
    if (has) return; // LP側で既に読み込み済み
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Jost:ital,wght@0,500;0,700;0,800;1,800&family=Noto+Sans+JP:wght@400;500;700;900&display=swap";
    document.head.appendChild(l);
  }
  function loadConfig(cb) {
    if (window.HAPPY_CONFIG) return cb();
    const s = document.createElement("script");
    s.src = BASE + "config.js";
    s.onload = cb;
    s.onerror = () => { console.warn("[happy-assess] config.js が見つかりません。既定値で動作します。"); cb(); };
    document.head.appendChild(s);
  }

  /* ---------------- テンプレート ---------------- */
  const TEMPLATE = `
  <div class="hda-head">
    <p class="hda-head__tag">＼ 写真を撮るだけ・約10秒 ／</p>
    <h2 class="hda-head__title"><span class="hda-head__ai">AI</span>が電線を見分けて<br><em>買取金額</em>をズバッと概算！</h2>
    <div class="hda-head__body">
      <p class="hda-head__lead">8割銅線 <b data-price="hachi"></b>円<br>6割銅線 <b data-price="roku"></b>円<br>Fケーブル <b data-price="f"></b>円<small>税込・1kgあたり</small></p>
      <img src="${IMG}nakamura-point.png" class="hda-head__chara" alt="">
    </div>
  </div>

  <ol class="hda-steps" data-el="steps">
    <li class="is-active"><span>1</span>写真</li>
    <li><span>2</span>AI判定</li>
    <li><span>3</span>重量</li>
    <li><span>4</span>金額</li>
  </ol>

  <!-- STEP 1 -->
  <section class="hda-panel is-active" data-step="1">
    <h3 class="hda-panel__title"><span class="hda-panel__num">STEP 1</span>電線の写真をアップ</h3>
    <p class="hda-panel__lead">被覆の色と<b>断面（切り口）</b>が見えるように撮ってください。</p>
    <label class="hda-drop" data-el="drop">
      <input type="file" data-el="file" accept="image/*" hidden>
      <div class="hda-drop__inner" data-el="dropInner">
        <svg viewBox="0 0 64 64" class="hda-drop__icon" aria-hidden="true">
          <rect x="6" y="16" width="52" height="38" rx="6" fill="none" stroke="currentColor" stroke-width="3"/>
          <path d="M22 16l4-7h12l4 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>
          <circle cx="32" cy="35" r="10" fill="none" stroke="currentColor" stroke-width="3"/>
          <circle cx="48" cy="24" r="2.5" fill="currentColor"/>
        </svg>
        <p class="hda-drop__text">ここをタップして<br>撮影 or 写真を選ぶ</p>
        <p class="hda-drop__sub">JPEG / PNG / HEIC対応</p>
      </div>
      <img data-el="preview" class="hda-drop__preview" alt="" hidden>
      <div class="hda-scan" data-el="scan" hidden>
        <div class="hda-scan__line"></div>
        <div class="hda-scan__corner hda-scan__corner--tl"></div>
        <div class="hda-scan__corner hda-scan__corner--tr"></div>
        <div class="hda-scan__corner hda-scan__corner--bl"></div>
        <div class="hda-scan__corner hda-scan__corner--br"></div>
        <p class="hda-scan__text"><img src="${IMG}nakamura-cheer.png" alt="">ハッピー中村が鑑定中<span class="hda-dots"><i>.</i><i>.</i><i>.</i></span></p>
      </div>
    </label>
    <div class="hda-btnrow">
      <button type="button" class="hda-btn hda-btn--outline" data-el="camera">📷 カメラで撮る</button>
      <button type="button" class="hda-btn hda-btn--outline" data-el="pick">🖼 写真を選ぶ</button>
    </div>
    <button type="button" class="hda-btn hda-btn--primary hda-btn--big" data-el="classify" disabled>AIで判定する</button>
    <ul class="hda-tips">
      <li>明るい場所で、電線に近づいて撮影</li>
      <li>黒い電線は「断面の銅の太さ」が判定のカギ</li>
      <li>灰色の平たい線はFケーブル（VA線）</li>
    </ul>
  </section>

  <!-- STEP 2 -->
  <section class="hda-panel" data-step="2">
    <h3 class="hda-panel__title"><span class="hda-panel__num">STEP 2</span>AI判定結果</h3>
    <div class="hda-result" data-el="result" style="margin-top:10px">
      <div class="hda-result__head">
        <img data-el="thumb" class="hda-result__thumb" alt="">
        <div class="hda-result__main">
          <p class="hda-result__label" data-el="resultLabel">判定結果</p>
          <p class="hda-result__name" data-el="resultName">—</p>
          <p class="hda-result__tag" data-el="resultTag"></p>
        </div>
      </div>
      <div class="hda-result__conf"><span>AI確信度</span><div class="hda-bar"><i data-el="confBar"></i></div><b data-el="confPct">—</b></div>
      <p class="hda-result__reason" data-el="resultReason"></p>
    </div>
    <p class="hda-panel__lead hda-panel__lead--sm">違う種類なら、タップして選び直してください。</p>
    <div class="hda-types" data-el="types">
      <button type="button" class="hda-type" data-type="hachi">
        <span class="hda-type__swatch hda-type__swatch--hachi"><i></i></span>
        <span class="hda-type__name">8割銅線</span>
        <span class="hda-type__desc">黒色・断面の銅率 約80%</span>
        <span class="hda-type__price"><b data-price="hachi"></b>円/kg</span>
      </button>
      <button type="button" class="hda-type" data-type="roku">
        <span class="hda-type__swatch hda-type__swatch--roku"><i></i></span>
        <span class="hda-type__name">6割銅線</span>
        <span class="hda-type__desc">黒色・断面の銅率 約60%</span>
        <span class="hda-type__price"><b data-price="roku"></b>円/kg</span>
      </button>
      <button type="button" class="hda-type" data-type="f">
        <span class="hda-type__swatch hda-type__swatch--f"><i></i></span>
        <span class="hda-type__name">Fケーブル（VA線）</span>
        <span class="hda-type__desc">灰色・平たい形</span>
        <span class="hda-type__price"><b data-price="f"></b>円/kg</span>
      </button>
    </div>
    <button type="button" class="hda-btn hda-btn--primary hda-btn--big" data-el="toWeight" disabled>この種類で重量を入力</button>
    <button type="button" class="hda-btn hda-btn--text" data-el="retake">← 写真を撮り直す</button>
  </section>

  <!-- STEP 3 -->
  <section class="hda-panel" data-step="3">
    <h3 class="hda-panel__title"><span class="hda-panel__num">STEP 3</span>重量を入力</h3>
    <p class="hda-chosen" data-el="chosen"></p>
    <span class="hda-label">重量<small>おおよそでOK（0.1kg単位）</small></span>
    <div class="hda-weight">
      <button type="button" class="hda-weight__btn" data-delta="-1" aria-label="1kg減らす">−</button>
      <div class="hda-weight__field"><input type="number" data-el="weight" inputmode="decimal" min="0.1" step="0.1" value="10" aria-label="重量（kg）"><span class="hda-weight__unit">kg</span></div>
      <button type="button" class="hda-weight__btn" data-delta="1" aria-label="1kg増やす">＋</button>
    </div>
    <div class="hda-chips" data-el="chips">
      <button type="button" data-w="5">5kg</button><button type="button" data-w="10">10kg</button><button type="button" data-w="20">20kg</button><button type="button" data-w="50">50kg</button><button type="button" data-w="100">100kg</button>
    </div>
    <p class="hda-weight__hint">袋・ドラムごとの重さでも構いません。</p>
    <button type="button" class="hda-btn hda-btn--primary hda-btn--big hda-btn--pulse" data-el="start">🎰 査定スタート！</button>
    <button type="button" class="hda-btn hda-btn--text" data-el="backToType">← 種類を選び直す</button>
  </section>

  <!-- STEP 4 -->
  <section class="hda-panel hda-panel--slot" data-step="4">
    <div class="hda-slot" data-el="slot">
      <div class="hda-slot__top">
        <img src="${IMG}happy-logo.png" class="hda-slot__toplogo" alt="">
        <span class="hda-slot__title">買取概算金額</span>
        <button type="button" class="hda-sound" data-el="sound" aria-pressed="false" title="効果音">🔇</button>
      </div>
      <div class="hda-slot__reelpanel">
        <div class="hda-lamps" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
        <div class="hda-slot__window">
          <span class="hda-slot__payline" aria-hidden="true"></span>
          <span class="hda-slot__yen">¥</span><div class="hda-reels" data-el="reels"></div>
        </div>
        <div class="hda-lamps hda-lamps--bottom" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
      </div>
      <div class="hda-slot__deck">
        <div class="hda-gogo" data-el="gogo" aria-label="ハッピーランプ">
          <span class="hda-gogo__flash"></span>
          <img src="${IMG}happy-logo.png" class="hda-gogo__logo" alt="ハッピー">
          <span class="hda-gogo__chance">CHANCE</span>
        </div>
        <div class="hda-led">
          <div class="hda-led__item"><span>WEIGHT</span><b data-el="ledKg">--</b><i>kg</i></div>
          <div class="hda-led__item"><span>PRICE</span><b data-el="ledPrice">----</b><i>円/kg</i></div>
        </div>
      </div>
      <p class="hda-slot__formula" data-el="formula"></p>
      <div class="hda-slot__controls">
        <div class="hda-slot__buttons" aria-hidden="true">
          <span class="hda-bet">MAX<br>BET</span>
          <i class="hda-stop hda-stop--r" data-el="stop1"></i>
          <i class="hda-stop hda-stop--y" data-el="stop2"></i>
          <i class="hda-stop hda-stop--g" data-el="stop3"></i>
        </div>
        <button type="button" class="hda-btn hda-btn--primary hda-btn--big hda-respin" data-el="respin">
          <span class="hda-respin__knob" aria-hidden="true"></span>
          <span>もう一度試す<small>レバーON！ランプを再抽選</small></span>
        </button>
      </div>
      <div class="hda-slot__msg" data-el="msg" hidden>
        <img src="${IMG}nakamura-cheer.png" alt="">
        <p data-el="msgText"></p>
      </div>
    </div>
    <p class="hda-disclaimer">※概算です。実際の買取金額は店頭での計量・状態確認と当日の相場で決まります。ハッピーランプは演出で、金額には影響しません。</p>
    <button type="button" class="hda-btn hda-btn--outline hda-btn--big hda-again" data-el="again">別の電線を査定する</button>
  </section>

  <p class="hda-src">買取単価の出典: <a data-el="source" href="#" target="_blank" rel="noopener">被覆銅線買取価格（店頭価格表）</a>・<span data-el="updated"></span>時点</p>
  `;

  /* ---------------- 本体 ---------------- */
  function mount(root) {
    if (root.dataset.hdaMounted) return;
    root.dataset.hdaMounted = "1";
    root.classList.add("hd-assess");
    root.innerHTML = TEMPLATE;

    const CFG = window.HAPPY_CONFIG || {};
    const PRICES = Object.assign({ hachi: 1660, roku: 1400, f: 860 }, CFG.prices || {});
    let priceUpdated = CFG.pricesUpdated || "";

    // スタッフ用: URLで単価を一時上書き ?p8=1700&p6=1450&pf=900 、HAPPYランプ強制 ?happy=1 / 0
    const qs = new URLSearchParams(location.search);
    const ov = { hachi: qs.get("p8"), roku: qs.get("p6"), f: qs.get("pf") };
    Object.keys(ov).forEach((k) => { if (ov[k] && !isNaN(+ov[k])) PRICES[k] = +ov[k]; });
    const forcedGogo = qs.get("happy");

    const TYPES = {
      hachi: { key: "hachi", name: "8割銅線", tag: "黒色電線・断面の銅率 約80%" },
      roku: { key: "roku", name: "6割銅線", tag: "黒色電線・断面の銅率 約60%" },
      f: { key: "f", name: "Fケーブル（VA線）", tag: "灰色電線・平たい形" }
    };

    const state = { dataUrl: null, base64: null, canvas: null, aiType: null, type: null, confidence: 0, weight: 10, amount: 0, spinning: false };

    const el = (name) => root.querySelector(`[data-el="${name}"]`);
    const $$ = (s) => Array.from(root.querySelectorAll(s));
    const yen = (n) => Math.round(n).toLocaleString("ja-JP");
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const vibrate = (pat) => { try { if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(pat); } catch (_) {} };

    /* 価格 */
    function renderPrices() {
      $$("[data-price]").forEach((e) => { e.textContent = yen(PRICES[e.dataset.price]); });
      el("updated").textContent = priceUpdated || "—";
      el("source").href = CFG.priceSource || "https://colors.main.jp/";
      if (state.type) el("chosen").innerHTML = `<b>${TYPES[state.type].name}</b> × <span>${yen(PRICES[state.type])}</span>円/kg`;
    }
    async function fetchRemotePrices() {
      if (!CFG.pricesEndpoint) return;
      try {
        const res = await fetch(CFG.pricesEndpoint, { cache: "no-store" });
        if (!res.ok) throw new Error(res.status);
        const j = await res.json();
        if (j && j.prices) {
          ["hachi", "roku", "f"].forEach((k) => { if (typeof j.prices[k] === "number" && j.prices[k] > 0) PRICES[k] = j.prices[k]; });
          if (j.updated) priceUpdated = j.updated;
          renderPrices();
        }
      } catch (e) { console.warn("[happy-assess] 価格の自動取得に失敗。config.js の単価を使用します。", e); }
    }

    /* ステップ */
    function goStep(n) {
      $$(".hda-panel").forEach((p) => p.classList.toggle("is-active", +p.dataset.step === n));
      $$("[data-el=steps] li").forEach((li, i) => { li.classList.toggle("is-active", i + 1 === n); li.classList.toggle("is-done", i + 1 < n); });
      const off = typeof CFG.scrollOffset === "number" ? CFG.scrollOffset : 80; // 固定ヘッダー分
      const top = el("steps").getBoundingClientRect().top + window.scrollY - off;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }

    /* トースト */
    let toastTimer;
    function toast(msg) {
      let t = document.querySelector(".hda-toast");
      if (!t) { t = document.createElement("div"); t.className = "hda-toast"; document.body.appendChild(t); }
      t.textContent = msg;
      requestAnimationFrame(() => t.classList.add("is-show"));
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => t.classList.remove("is-show"), 2600);
    }

    /* 画像 */
    function loadImage(file) {
      return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("load error")); };
        img.src = url;
      });
    }
    async function handleFile(file) {
      if (!file) return;
      if (!file.type.startsWith("image/") && !/\.(heic|heif|jpe?g|png|webp)$/i.test(file.name || "")) { toast("画像ファイルを選んでください"); return; }
      let img;
      try { img = await loadImage(file); } catch (e) { toast("この形式は表示できません。JPEGかPNGでお試しください"); return; }
      const MAX = 1024;
      const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * scale);
      c.height = Math.round(img.naturalHeight * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      state.dataUrl = c.toDataURL("image/jpeg", 0.86);
      state.base64 = state.dataUrl.split(",")[1];
      state.canvas = c;
      const pv = el("preview");
      pv.src = state.dataUrl; pv.hidden = false;
      el("dropInner").hidden = true;
      el("drop").classList.add("has-image");
      el("classify").disabled = false;
      el("thumb").src = state.dataUrl;
    }

    /* 判定 */
    async function classifyViaApi() {
      const res = await fetch(CFG.classifyEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: state.base64, media_type: "image/jpeg" }) });
      if (!res.ok) throw new Error("API " + res.status);
      const j = await res.json();
      if (!j || !j.category) throw new Error("bad response");
      return { type: j.category, confidence: Number(j.confidence) || 0, reason: j.reason || "", source: "ai" };
    }
    // ブラウザ内簡易判定（APIなしのフォールバック）
    // 1) 灰色が支配的 → Fケーブル
    // 2) 銅色の丸い断面ブロブを抽出し、周囲が黒い被覆だけなら単心（8割候補）、他の芯線や介在物が見えれば多心（6割）
    // 3) 単心は「被覆の厚み / 導体半径」から銅の重量比を推定し、0.72以上を8割とする
    function classifyLocal() {
      const src = state.canvas;
      const W = 320, H = Math.max(1, Math.round((src.height / src.width) * W));
      const c = document.createElement("canvas"); c.width = W; c.height = H;
      const ctx = c.getContext("2d"); ctx.drawImage(src, 0, 0, W, H);
      const px = ctx.getImageData(0, 0, W, H).data;
      const N = W * H;
      const copper = new Uint8Array(N), sheath = new Uint8Array(N), colored = new Uint8Array(N);
      let gray = 0, dark = 0, cop = 0;
      for (let i = 0; i < N; i++) {
        const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        const lum = .299 * r + .587 * g + .114 * b, sat = mx === 0 ? 0 : (mx - mn) / mx;
        const isC = r > 95 && r > g * 1.25 && g >= b * .95 && sat > .3 && lum > 50;
        if (isC) { copper[i] = 1; cop++; continue; }
        if (lum < 70) dark++;
        if (sat < .16 && lum >= 95 && lum <= 215) gray++;
        if (lum < 90 || (sat < .2 && lum < 150)) sheath[i] = 1;
        else if (sat > .3) colored[i] = 1;
      }
      const gR = gray / N, dR = dark / N, cR = cop / N;
      if (gR > .30 && gR > dR * 1.2 && cR < .05) {
        return { type: "f", confidence: Math.min(.85, .5 + gR * .6), reason: "灰色の被覆が多く写っているため、Fケーブル（VA線）と推定しました。", source: "local" };
      }
      // クロージング（膨張3→収縮3）でストランドの影で割れた銅断面を1つにまとめる
      const dil = (m) => { const o = new Uint8Array(N); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (m[i] || (y > 0 && m[i - W]) || (y < H - 1 && m[i + W]) || (x > 0 && m[i - 1]) || (x < W - 1 && m[i + 1])) o[i] = 1; } return o; };
      const ero = (m) => { const o = new Uint8Array(N); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (m[i] && (y === 0 || m[i - W]) && (y === H - 1 || m[i + W]) && (x === 0 || m[i - 1]) && (x === W - 1 || m[i + 1])) o[i] = 1; } return o; };
      let cm = copper; for (let k = 0; k < 3; k++) cm = dil(cm); for (let k = 0; k < 3; k++) cm = ero(cm);
      // 連結成分ラベリング
      const lab = new Int32Array(N); const blobs = []; let nid = 0; const queue = new Int32Array(N);
      for (let s0 = 0; s0 < N; s0++) {
        if (!cm[s0] || lab[s0]) continue;
        nid++; let qh = 0, qt = 0; queue[qt++] = s0; lab[s0] = nid;
        let area = 0, sy = 0, sx = 0, minx = W, maxx = 0, miny = H, maxy = 0;
        while (qh < qt) {
          const i = queue[qh++]; const y = (i / W) | 0, x = i - y * W;
          area++; sy += y; sx += x; if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
          if (y > 0 && cm[i - W] && !lab[i - W]) { lab[i - W] = nid; queue[qt++] = i - W; }
          if (y < H - 1 && cm[i + W] && !lab[i + W]) { lab[i + W] = nid; queue[qt++] = i + W; }
          if (x > 0 && cm[i - 1] && !lab[i - 1]) { lab[i - 1] = nid; queue[qt++] = i - 1; }
          if (x < W - 1 && cm[i + 1] && !lab[i + 1]) { lab[i + 1] = nid; queue[qt++] = i + 1; }
        }
        if (area < 30 || area > .15 * N) continue;
        const bw = maxx - minx + 1, bh = maxy - miny + 1, fill = area / (bw * bh), aspect = bw / bh;
        if (fill > .45 && aspect > .45 && aspect < 2.2) blobs.push({ id: nid, area, cy: sy / area, cx: sx / area, rc: Math.sqrt(area / Math.PI) });
      }
      if (!blobs.length) {
        return { type: "unknown", confidence: .2, reason: "断面（切り口）がはっきり写っていないため判別できませんでした。切り口が見えるように撮るか、下から種類を選んでください。", source: "local" };
      }
      const at = (cy, cx, sn, cs, d) => { const y = Math.round(cy + sn * d), x = Math.round(cx + cs * d); return (y < 0 || y >= H || x < 0 || x >= W) ? -1 : y * W + x; };
      let ev8 = 0, ev6 = 0;
      for (const bl of blobs) {
        const { cy, cx, id, rc } = bl;
        // 導体の周囲（1.25rc）に何があるか
        let n = 0, dk = 0, cp = 0, co = 0;
        for (let k = 0; k < 48; k++) {
          const ang = 2 * Math.PI * k / 48; const i = at(cy, cx, Math.sin(ang), Math.cos(ang), rc * 1.25);
          if (i < 0) continue; n++;
          if (lab[i] && lab[i] !== id) cp++;
          else if (copper[i] || lab[i] === id) { /* 自分の導体 */ }
          else if (sheath[i]) dk++;
          else if (colored[i]) co++;
        }
        if (n < 24) continue;
        if (cp / n > .15 || co / n > .3 || dk / n < .45) { ev6 += bl.area; continue; }
        // 単心: 被覆の厚みを24方向で測る
        const ts = [];
        for (let k = 0; k < 24; k++) {
          const ang = 2 * Math.PI * k / 24, sn = Math.sin(ang), cs = Math.cos(ang);
          let d = 0, Rin = -1, gap = 0;
          while (d < rc * 3) {
            const i = at(cy, cx, sn, cs, d); if (i < 0) break;
            if (lab[i] === id || (copper[i] && !lab[i])) { Rin = d; gap = 0; } else if (++gap > 1) break;
            d++;
          }
          if (Rin < 2) continue;
          let t = 0; gap = 0; d = Rin + 1;
          while (d < Rin * 4 + 6) {
            const i = at(cy, cx, sn, cs, d); if (i < 0) break;
            if (lab[i] && lab[i] !== id) break;
            if (sheath[i]) { t = d - Rin; gap = 0; } else if (++gap > 2) break;
            d++;
          }
          const tr = t / Rin;
          if (tr <= 2.5) ts.push(tr); // 隣のケーブルまで走った方向は無効
        }
        if (ts.length < 8) continue;
        ts.sort((a, b) => a - b);
        const tr = ts[Math.floor(ts.length * .3)];
        const ratio = 1 / (1 + tr), areaR = ratio * ratio;
        const wR = areaR * 8.9 / (areaR * 8.9 + (1 - areaR) * 1.4); // 銅の重量比（比重 銅8.9 / 被覆1.4）
        if (wR >= .72) ev8 += bl.area; else ev6 += bl.area;
      }
      const tot = ev8 + ev6;
      if (!tot) return { type: "unknown", confidence: .2, reason: "断面をうまく読み取れませんでした。切り口が見えるように撮るか、下から種類を選んでください。", source: "local" };
      const p8 = ev8 / tot;
      const conf = .5 + .35 * Math.abs(p8 - .5) * 2 * Math.min(1, blobs.length / 4);
      if (p8 >= .5) return { type: "hachi", confidence: conf, reason: "断面の銅が太く、黒い被覆が薄いため、8割銅線と推定しました。", source: "local" };
      return { type: "roku", confidence: conf, reason: "断面に複数の芯線や厚めの被覆が見えるため、6割銅線と推定しました。", source: "local" };
    }
    async function runClassify() {
      if (!state.base64) return;
      el("classify").disabled = true;
      el("scan").hidden = false;
      const started = Date.now();
      let result;
      try {
        if (CFG.classifyEndpoint) {
          try { result = await classifyViaApi(); }
          catch (e) { console.warn("[happy-assess] AI APIに接続できないため簡易判定", e); result = classifyLocal(); result.fallback = true; }
        } else result = classifyLocal();
      } catch (e) { result = { type: "unknown", confidence: 0, reason: "判定に失敗しました。種類を選んでください。", source: "local" }; }
      await sleep(Math.max(0, 1800 - (Date.now() - started)));
      el("scan").hidden = true;
      el("classify").disabled = false;
      showResult(result);
      goStep(2);
    }
    function showResult(r) {
      state.aiType = TYPES[r.type] ? r.type : null;
      state.confidence = r.confidence;
      el("result").classList.toggle("is-unknown", !state.aiType);
      if (state.aiType) {
        el("resultLabel").textContent = r.source === "ai" ? "AI判定結果" : "簡易判定結果";
        el("resultName").textContent = TYPES[state.aiType].name;
        el("resultTag").textContent = TYPES[state.aiType].tag;
      } else {
        el("resultLabel").textContent = "判定結果";
        el("resultName").textContent = "判別できませんでした";
        el("resultTag").textContent = "下から種類を選んでください";
      }
      const pct = Math.round(Math.max(0, Math.min(1, r.confidence)) * 100);
      el("confPct").textContent = pct + "%";
      el("confBar").style.width = "0%";
      setTimeout(() => { el("confBar").style.width = pct + "%"; }, 80);
      el("resultReason").textContent = r.reason || "";
      if (r.fallback) toast("AIサーバーに接続できないため、簡易判定で表示しています");
      $$("[data-el=types] .hda-type").forEach((b) => b.classList.toggle("is-ai", b.dataset.type === state.aiType));
      setType(state.aiType);
    }
    function setType(key) {
      state.type = TYPES[key] ? key : null;
      $$("[data-el=types] .hda-type").forEach((b) => b.classList.toggle("is-selected", b.dataset.type === state.type));
      el("toWeight").disabled = !state.type;
      if (state.type) el("chosen").innerHTML = `<b>${TYPES[state.type].name}</b> × <span>${yen(PRICES[state.type])}</span>円/kg`;
    }

    /* 重量 */
    function setWeight(w) {
      w = Math.round(Math.max(.1, Math.min(99999, w)) * 10) / 10;
      state.weight = w;
      const inp = el("weight");
      if (document.activeElement !== inp || String(w) !== inp.value) inp.value = w;
      $$("[data-el=chips] button").forEach((b) => b.classList.toggle("is-on", +b.dataset.w === w));
    }

    /* 効果音 */
    const Sound = {
      ctx: null, on: false,
      init() { if (!this.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) this.ctx = new AC(); } if (this.ctx && this.ctx.state === "suspended") this.ctx.resume(); },
      beep(freq, dur, type = "square", gain = .06, when = 0) {
        if (!this.on || !this.ctx) return;
        const t = this.ctx.currentTime + when, o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = type; o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
        o.connect(g).connect(this.ctx.destination); o.start(t); o.stop(t + dur + .02);
      },
      tick() { this.beep(1200, .05, "square", .05); },
      stop() { this.beep(520, .12, "triangle", .09); this.beep(780, .1, "triangle", .06, .03); },
      peka() { // 「ペカッ」告知音（ジャグラー風の雰囲気を狙った独自音）: 高速上昇アルペジオ → 高音のロング + トレモロ
        [1568, 1976, 2349, 2794, 3136].forEach((f, i) => this.beep(f, .12, "square", .05, i * .045));
        this.beep(3136, .7, "sine", .09, .24); this.beep(4186, .55, "sine", .04, .27);
        for (let i = 0; i < 9; i++) this.beep(3136 * (i % 2 ? 1 : 1.006), .07, "triangle", .035, .42 + i * .07);
      },
      done() { this.beep(880, .15, "triangle", .07); this.beep(1175, .25, "triangle", .07, .12); },
      win() { // 大当たりファンファーレ（独自メロディ・約2.6秒）: スクエア波リード + トライアングル波ベース + キラキラ
        const q = 60 / 172;
        const lead = [[659, .5], [784, .5], [1047, .5], [1319, .5], [1175, .5], [1047, .5], [784, 1], [880, .5], [988, .5], [1047, .5], [1319, .5], [1568, 1.5]];
        let t = 0;
        lead.forEach(([f, d]) => { this.beep(f, q * d * .9, "square", .05, t); this.beep(f * 2, q * d * .9, "triangle", .02, t); t += q * d; });
        [262, 262, 349, 349, 392, 392, 262, 262, 349, 392, 523, 523].forEach((f, i) => this.beep(f, q * .45, "triangle", .06, i * q));
        for (let i = 0; i < 12; i++) this.beep(2000 + i * 230, .06, "sine", .03, t - .2 + i * .04);
      }
    };

    /* スロット */
    function buildReels(amount) {
      const str = String(Math.max(0, Math.round(amount)));
      const reels = el("reels");
      reels.innerHTML = "";
      reels.classList.toggle("is-compact", str.length >= 6);
      const digits = str.split("");
      digits.forEach((d, i) => {
        const remaining = digits.length - i;
        const reel = document.createElement("div"); reel.className = "hda-reel";
        const strip = document.createElement("div"); strip.className = "hda-reel__strip";
        const loops = 3 + i;
        let html = "";
        for (let l = 0; l < loops; l++) for (let n = 0; n < 10; n++) html += `<span>${n}</span>`;
        for (let n = 0; n <= +d; n++) html += `<span>${n}</span>`;
        strip.innerHTML = html;
        strip.dataset.target = loops * 10 + +d;
        reel.appendChild(strip); reels.appendChild(reel);
        if (remaining > 1 && (remaining - 1) % 3 === 0) { const sep = document.createElement("span"); sep.className = "hda-reel-sep"; sep.textContent = ","; reels.appendChild(sep); }
      });
    }

    // HAPPYランプ点灯（ペカッ）: 一瞬ちらついてから点きっぱなし
    async function igniteGogo() {
      const g = el("gogo");
      Sound.peka();
      g.classList.add("is-flash");
      g.classList.add("is-on"); await sleep(70);
      g.classList.remove("is-on"); await sleep(60);
      g.classList.add("is-on"); await sleep(50);
      g.classList.remove("is-on"); await sleep(40);
      g.classList.add("is-on");
      vibrate([30, 30, 120]);
      setTimeout(() => g.classList.remove("is-flash"), 600);
    }

    async function spin() {
      if (state.spinning || !state.type) return;
      state.spinning = true;
      Sound.init();
      const slot = el("slot"), gogo = el("gogo"), msg = el("msg");
      el("respin").disabled = true;
      msg.hidden = true;
      gogo.classList.remove("is-on", "is-flash");
      slot.classList.remove("is-win", "is-shake");
      slot.classList.add("is-spinning");

      // 抽選: 毎回ランダム。当たりならリールが回り始めた瞬間に点灯
      const chance = typeof CFG.happyChance === "number" ? CFG.happyChance : typeof CFG.gogoChance === "number" ? CFG.gogoChance : .33;
      const peka = forcedGogo === "1" ? true : forcedGogo === "0" ? false : Math.random() < chance;

      state.amount = Math.floor(PRICES[state.type] * state.weight);
      el("formula").innerHTML = `${TYPES[state.type].name} <b>${state.weight}</b>kg × <b>${yen(PRICES[state.type])}</b>円（税込・概算）`;
      el("ledKg").textContent = state.weight;
      el("ledPrice").textContent = yen(PRICES[state.type]);
      ["stop1", "stop2", "stop3"].forEach((k) => el(k).classList.remove("is-lit"));
      el("respin").classList.add("is-pull");
      setTimeout(() => el("respin").classList.remove("is-pull"), 260);
      buildReels(state.amount);

      const strips = $$("[data-el=reels] .hda-reel__strip");
      const DIGIT_H = strips.length ? strips[0].firstElementChild.getBoundingClientRect().height || 56 : 56; // レスポンシブで高さが変わるため実測
      strips.forEach((s) => { s.style.transition = "none"; s.style.transform = "translateY(0)"; s.classList.add("is-blur"); });
      void slot.offsetWidth;

      if (peka) igniteGogo(); // 回転開始と同時にペカッ

      const base = 1300, stagger = 380;
      const ticker = setInterval(() => Sound.tick(), 90);
      const stopMap = { 0: "stop1", [Math.floor((strips.length - 1) / 2)]: "stop2", [strips.length - 1]: "stop3" };
      strips.forEach((s, i) => {
        const dur = base + i * stagger;
        s.style.transition = `transform ${dur}ms cubic-bezier(.12,.75,.25,1.04)`;
        s.style.transform = `translateY(-${(+s.dataset.target) * DIGIT_H}px)`;
        setTimeout(() => { s.classList.remove("is-blur"); Sound.stop(); if (stopMap[i]) el(stopMap[i]).classList.add("is-lit"); }, dur);
      });
      await sleep(base + (strips.length - 1) * stagger + 80);
      clearInterval(ticker);
      slot.classList.remove("is-spinning");

      if (peka) {
        slot.classList.add("is-win", "is-shake");
        el("msgText").innerHTML = "<b>ペカッ！大当たり〜！</b><br>ハッピー中村もビックリの買取目安です";
        msg.classList.add("is-peka");
        Sound.win();
        confetti(slot, 170);
        vibrate([60, 40, 60, 40, 160]);
      } else {
        el("msgText").innerHTML = "<b>査定完了！</b><br>この金額がお買取りの目安です";
        msg.classList.remove("is-peka");
        Sound.done();
        confetti(slot, 40);
      }
      msg.hidden = false;
      el("respin").disabled = false;
      state.spinning = false;
    }

    /* 紙吹雪 */
    function confetti(anchor, count) {
      let cv = document.querySelector(".hda-confetti");
      if (!cv) { cv = document.createElement("canvas"); cv.className = "hda-confetti"; document.body.appendChild(cv); }
      const ctx = cv.getContext("2d");
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const rect = anchor.getBoundingClientRect();
      const cx = rect.left + rect.width / 2, cy = rect.top + rect.height * .35;
      const colors = ["#ff1874", "#ffe600", "#d9c86e", "#00156d", "#ffffff", "#ff7fb4"];
      const parts = [];
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2, sp = 6 + Math.random() * 9;
        parts.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 6, w: 6 + Math.random() * 6, h: 4 + Math.random() * 6, rot: Math.random() * Math.PI, vr: (Math.random() - .5) * .3, c: colors[i % colors.length], coin: i % 5 === 0, life: 1 });
      }
      let t0 = performance.now();
      function frame(now) {
        const dt = Math.min(40, now - t0) / 16.7; t0 = now;
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        let alive = 0;
        for (const p of parts) {
          p.vy += .35 * dt; p.vx *= .985; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.life -= .006 * dt;
          if (p.life <= 0 || p.y > innerHeight + 20) continue;
          alive++;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.5));
          if (p.coin) { ctx.fillStyle = "#f5c518"; ctx.beginPath(); ctx.ellipse(0, 0, 6, 6 * Math.abs(Math.cos(p.rot * 2)), 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#b8860b"; ctx.lineWidth = 1; ctx.stroke(); }
          else { ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); }
          ctx.restore();
        }
        if (alive > 0) requestAnimationFrame(frame); else ctx.clearRect(0, 0, innerWidth, innerHeight);
      }
      requestAnimationFrame(frame);
    }

    /* リセット */
    function resetAll() {
      state.dataUrl = state.base64 = null; state.aiType = state.type = null;
      el("preview").hidden = true; el("preview").src = "";
      el("dropInner").hidden = false;
      el("drop").classList.remove("has-image");
      el("classify").disabled = true;
      el("file").value = "";
      el("gogo").classList.remove("is-on", "is-flash");
      el("slot").classList.remove("is-win", "is-spinning");
      el("msg").hidden = true;
      goStep(1);
    }

    /* イベント */
    const fileInput = el("file"), drop = el("drop");
    fileInput.addEventListener("change", () => handleFile(fileInput.files[0]));
    el("camera").addEventListener("click", (e) => { e.preventDefault(); fileInput.setAttribute("capture", "environment"); fileInput.click(); });
    el("pick").addEventListener("click", (e) => { e.preventDefault(); fileInput.removeAttribute("capture"); fileInput.click(); });
    drop.addEventListener("click", (e) => { if (e.target !== fileInput) { e.preventDefault(); fileInput.removeAttribute("capture"); fileInput.click(); } });
    ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("is-over"); }));
    ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("is-over"); }));
    drop.addEventListener("drop", (e) => { const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) handleFile(f); });

    el("classify").addEventListener("click", runClassify);
    $$("[data-el=types] .hda-type").forEach((b) => b.addEventListener("click", () => setType(b.dataset.type)));
    el("toWeight").addEventListener("click", () => { setWeight(state.weight); goStep(3); });
    el("retake").addEventListener("click", resetAll);

    $$(".hda-weight__btn").forEach((b) => b.addEventListener("click", () => setWeight(state.weight + +b.dataset.delta)));
    el("weight").addEventListener("input", (e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) setWeight(v); });
    el("weight").addEventListener("blur", () => setWeight(state.weight));
    el("weight").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); el("start").click(); } });
    $$("[data-el=chips] button").forEach((b) => b.addEventListener("click", () => setWeight(+b.dataset.w)));
    el("backToType").addEventListener("click", () => goStep(2));

    el("start").addEventListener("click", () => {
      if (!state.type) { toast("種類を選んでください"); goStep(2); return; }
      if (!(state.weight > 0)) { toast("重量を入力してください"); return; }
      Sound.init();
      goStep(4);
      setTimeout(spin, 350);
    });
    el("respin").addEventListener("click", spin);
    // 画面幅が変わってリールの高さが変わったら、停止位置を取り直す
    window.addEventListener("resize", () => {
      if (state.spinning) return;
      $$("[data-el=reels] .hda-reel__strip").forEach((s) => {
        const hgt = s.firstElementChild ? s.firstElementChild.getBoundingClientRect().height : 0;
        if (hgt && s.dataset.target) { s.style.transition = "none"; s.style.transform = `translateY(-${(+s.dataset.target) * hgt}px)`; }
      });
    });
    el("again").addEventListener("click", resetAll);

    const sb = el("sound");
    try { Sound.on = localStorage.getItem("hd_sound") === "1"; } catch (_) {}
    const renderSound = () => { sb.textContent = Sound.on ? "🔊" : "🔇"; sb.setAttribute("aria-pressed", String(Sound.on)); };
    renderSound();
    sb.addEventListener("click", () => {
      Sound.on = !Sound.on; Sound.init(); renderSound();
      try { localStorage.setItem("hd_sound", Sound.on ? "1" : "0"); } catch (_) {}
      if (Sound.on) Sound.stop();
    });

    renderPrices();
    fetchRemotePrices();
    setWeight(10);
  }

  /* ---------------- 起動 ---------------- */
  function boot() {
    loadCss();
    loadFonts();
    loadConfig(() => {
      document.querySelectorAll("#happy-assess, [data-happy-assess]").forEach(mount);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.HappyAssess = { mount };
})();
