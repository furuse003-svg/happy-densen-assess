/* =====================================================================
 * ハッピーデンセン AI自動査定ウィジェット — 埋め込みスクリプト（デザイン再現版）
 *
 *   <div id="happy-assess"></div>
 *   <script src="https://<公式サイト>/assess/embed.js" defer></script>
 *
 * 4画面構成: 査定前(upload) → AI解析(analyze) → 査定結果 通常(result) / 最強(jackpot)
 * 固定幅1120pxのキャンバスを、置かれた枠の幅に合わせて縮小表示する。
 * style.css / config.js / img/ は embed.js と同じフォルダから自動で読み込む。
 * ===================================================================== */
(() => {
  "use strict";

  const SCRIPT = document.currentScript;
  const BASE = SCRIPT && SCRIPT.src ? SCRIPT.src.replace(/[^/]*$/, "") : "";
  const IMG = BASE + "img/";
  // 画像パス解決（共有用ビルドでは window.HAPPY_ASSETS に data URI が入る）
  const asset = (name) => (window.HAPPY_ASSETS && window.HAPPY_ASSETS[name]) || (IMG + name);
  const CANVAS_W = 840;

  /* ---------------- 依存の読み込み ---------------- */
  function loadCss() {
    if (document.querySelector('[data-hda-css]')) return;
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = BASE + "style.css";
    l.dataset.hdaCss = "1";
    document.head.appendChild(l);
  }
  function loadFonts() {
    const has = Array.from(document.querySelectorAll('link[rel=stylesheet]')).some((l) => /fonts\.googleapis\.com.*Jost/.test(l.href));
    if (has) return;
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

  /* ---------------- 共通パーツ ---------------- */
  const ICON_CAMERA = '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="5" y="13" width="38" height="27" rx="4" fill="none" stroke="currentColor" stroke-width="3"/><path d="M17 13l3-5h8l3 5" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><circle cx="24" cy="26" r="7" fill="none" stroke="currentColor" stroke-width="3"/></svg>';
  const ICON_AI = '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="10" y="10" width="28" height="28" rx="5" fill="none" stroke="currentColor" stroke-width="3"/><text x="24" y="30" text-anchor="middle" font-family="Jost, sans-serif" font-weight="800" font-size="15" fill="currentColor">AI</text><path d="M17 4v6M24 4v6M31 4v6M17 38v6M24 38v6M31 38v6M4 17h6M4 24h6M4 31h6M38 17h6M38 24h6M38 31h6" stroke="currentColor" stroke-width="3"/></svg>';
  const ICON_DOC = '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="9" y="5" width="30" height="38" rx="3" fill="none" stroke="currentColor" stroke-width="3"/><path d="M16 16h16M16 24h16M16 32h10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';
  const ICON_LINE = '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="6" width="36" height="36" rx="9" fill="#06c755"/><text x="24" y="29" text-anchor="middle" font-family="Jost, sans-serif" font-weight="800" font-size="13" fill="#fff">LINE</text></svg>';

  const stepsHtml = (active) => `
    <div class="hda-steps">
      <div class="hda-step ${active > 1 ? "is-done" : active === 1 ? "is-active" : ""}"><span class="hda-step__icon">${ICON_CAMERA}</span><span class="hda-step__pill">写真をアップロード</span></div>
      <span class="hda-steps__arrow">›</span>
      <div class="hda-step ${active > 2 ? "is-done" : active === 2 ? "is-active" : ""}"><span class="hda-step__icon">${ICON_AI}</span><span class="hda-step__pill">AI解析</span></div>
      <span class="hda-steps__arrow">›</span>
      <div class="hda-step ${active === 3 ? "is-active" : ""}"><span class="hda-step__icon">${ICON_DOC}</span><span class="hda-step__pill">査定結果</span></div>
    </div>`;

  const sideDeco = `
    <img class="hda-abs hda-title" src="${asset("title.jpg")}" alt="AIサイボーグ中村の電線自動査定">
    <p class="hda-abs hda-recycle">RECYCLE<br>REUSE<br>CONNECT<br>TO<br>TOMORROW</p>`;

  const featuresHtml = (four) => `
    <section class="hda-abs hda-features ${four ? "" : "hda-features--3"}" aria-label="特徴">
      <div class="hda-feature"><img src="${asset("icon-speed.png")}" alt=""><div><b>かんたん${four ? "<br>スピード査定" : "査定"}</b><small>写真を送るだけで${four ? "即結果！" : "OK"}</small></div></div>
      <div class="hda-feature"><img src="${asset("icon-recycle.png")}" alt=""><div><b>${four ? "環境にやさしい<br>" : ""}リサイクル</b><small>資源をつなぎ、未来をつくる。</small></div></div>
      ${four ? `<div class="hda-feature"><img src="${asset("icon-price.png")}" alt=""><div><b>高価買取</b><small>相場に基づく適正価格</small></div></div>` : ""}
      <div class="hda-feature"><img src="${asset("icon-delivery.png")}" alt=""><div><b>持込・宅配${four ? "<br>どちらも" : ""}対応</b><small>全国対応・大量もOK</small></div></div>
    </section>`;

  /* ---------------- テンプレート ---------------- */
  const TEMPLATE = `
  <button type="button" class="hda-sound" data-el="sound" aria-pressed="false" aria-label="効果音の切り替え" title="効果音">🔇</button>
  <div class="hda-canvas" data-el="canvas">

    <!-- ========== 画面A: 査定前 ========== -->
    <section class="hda-screen hda-screen--upload" data-screen="upload">
      <div class="hda-screen__bg"><img src="${asset("bg-warehouse.jpg")}" alt=""></div>
      ${sideDeco}
      <p class="hda-abs hda-lead">写真を撮って、送るだけ。<br>あなたの電線をAIが瞬時に査定！</p>
      <img class="hda-abs hda-chara hda-chara--main" src="${asset("nakamura-full1.png")}" alt="">
      <div class="hda-abs hda-bubble hda-bubble--ai hda-bubble--tail-right"><img src="${asset("robot-icon.jpg")}" alt=""><span><em>AI</em>が<br>すぐに査定するぞ！</span></div>
      <ul class="hda-abs hda-checks">
        <li>断面の写真から種類を自動判定</li>
        <li>8割・6割・Fケーブルを判別</li>
        <li>最新の買取単価で即査定</li>
        <li>LINEでかんたん申込</li>
      </ul>

      <div class="hda-abs hda-upload">
        <label class="hda-drop" data-el="drop">
          <input type="file" data-el="file" accept="image/*" hidden>
          <div class="hda-drop__inner" data-el="dropInner">
            <img class="hda-drop__icon" src="${asset("upload-icon.png")}" alt="">
            <p class="hda-drop__text">電線の写真をドラッグ＆ドロップ</p>
            <p class="hda-drop__sub">または <u>タップして撮影・画像を選択</u></p>
            <p class="hda-drop__note">※ 被覆の色と断面（切り口）が見えるように撮ってください（1枚でOK）</p>
          </div>
          <img data-el="preview" class="hda-drop__preview" alt="" hidden>
          <div class="hda-scan" data-el="scan" hidden>
            <div class="hda-scan__line"></div>
            <div class="hda-scan__corner hda-scan__corner--tl"></div><div class="hda-scan__corner hda-scan__corner--tr"></div>
            <div class="hda-scan__corner hda-scan__corner--bl"></div><div class="hda-scan__corner hda-scan__corner--br"></div>
            <p class="hda-scan__text"><img src="${asset("robot-icon.jpg")}" alt="">AI中村が解析中<span class="hda-dots"><i>.</i><i>.</i><i>.</i></span></p>
          </div>
        </label>
        <p class="hda-examples__title">断面（切り口）が見える写真でOK！</p>
        <div class="hda-examples__row hda-examples__row--3">
          <figure><img src="${asset("ex-hachi.jpg")}" alt=""><figcaption>8割銅線<small>黒色・銅が太い</small></figcaption></figure>
          <figure><img src="${asset("ex-roku.jpg")}" alt=""><figcaption>6割銅線<small>黒色・芯線が複数</small></figcaption></figure>
          <figure><img src="${asset("ex-f.jpg")}" alt=""><figcaption>Fケーブル<small>灰色・平たい</small></figcaption></figure>
        </div>
        <button type="button" class="hda-btn hda-btn--yellow" data-el="classify" disabled>AIで査定する</button>
      </div>

      <section class="hda-abs hda-example" aria-label="査定結果の一例">
        <p class="hda-example__title">査定結果の一例</p>
        <div class="hda-example__card">
          <img src="${asset("ex-hachi.jpg")}" alt="">
          <div>
            <p class="hda-example__name">8割銅線（CVケーブル）</p>
            <dl class="hda-example__rows">
              <div><dt>種類</dt><dd>黒色・銅率 約80%</dd></div>
              <div><dt>重量</dt><dd>約 20 kg</dd></div>
              <div><dt>単価</dt><dd data-el="exPrice"></dd></div>
            </dl>
          </div>
          <div class="hda-example__price"><span>参考査定金額</span><b data-el="exAmount"></b></div>
          <small class="hda-example__note">※実際の査定額は現物確認により変動する場合があります。</small>
        </div>
      </section>

      ${featuresHtml(true)}

      <section class="hda-abs hda-flow" aria-label="査定の流れ">
        <p class="hda-flow__title">査定の流れ</p>
        <div class="hda-flow__inner">
          <ol class="hda-flow__grid">
            <li class="hda-flow__step"><span class="hda-flow__num">01</span><span class="hda-flow__icon">${ICON_CAMERA}</span><p>写真をアップロード<small>または重量を入力</small></p></li>
            <li class="hda-flow__step"><span class="hda-flow__num">02</span><span class="hda-flow__icon">${ICON_AI}</span><p>AIが電線を解析<small>種類・銅率を判定</small></p></li>
            <li class="hda-flow__step"><span class="hda-flow__num">03</span><span class="hda-flow__icon">${ICON_DOC}</span><p>査定結果をすぐに表示<small>買取価格をご案内</small></p></li>
            <li class="hda-flow__step"><span class="hda-flow__num">04</span><span class="hda-flow__icon">${ICON_LINE}</span><p>LINEで申込 or<small>店舗・宅配で買取</small></p></li>
          </ol>
          <a class="hda-btn hda-btn--line" data-el="lineLink1" href="#" target="_blank" rel="noopener"><span class="hda-line__icon">LINE</span><span>LINEで<br>今すぐ査定！</span><span class="hda-chev" aria-hidden="true">→</span></a>
        </div>
      </section>
    </section>

    <!-- ========== 画面B: AI解析（種類の確認 + 重量入力） ========== -->
    <section class="hda-screen hda-screen--analyze" data-screen="analyze" hidden>
      <div class="hda-screen__bg"><img src="${asset("bg-warehouse.jpg")}" alt=""></div>
      ${sideDeco}
      <img class="hda-abs hda-chara hda-chara--main" data-el="analyzeChara" src="${asset("nakamura-full1.png")}" alt="">
      <img class="hda-abs hda-neon hda-neon--react" data-el="analyzeNeon" src="${asset("neon-wrong.png")}" alt="" hidden>
      <div class="hda-abs hda-bubble hda-bubble--ai" data-el="analyzeBubbleWrap"><img src="${asset("robot-icon.jpg")}" alt=""><span data-el="analyzeBubble"><em>AI</em>解析が<br>完了したぞ！</span></div>
      <div class="hda-abs hda-steps-wrap hda-steps" data-el="steps2">${stepsHtml(2).replace('<div class="hda-steps">', "").replace(/<\/div>\s*$/, "")}</div>
      <h2 class="hda-abs hda-h1" data-el="analyzeTitle">AI解析が完了しました！<span class="hda-h1sub" data-el="analyzeSub">種類を確認して、重量を入力してください。</span></h2>
      <div class="hda-abs hda-panel">
        <div class="hda-panel__head" data-el="resultHead"><span class="hda-check">✓</span><span data-el="resultHeadText">AI解析完了</span></div>
        <div class="hda-result" data-el="result">
          <img data-el="thumb" class="hda-result__thumb" alt="">
          <div>
            <p class="hda-result__name" data-el="resultName">—</p>
            <p class="hda-result__tag" data-el="resultTag"></p>
            <div class="hda-result__conf"><span>AI確信度</span><div class="hda-bar"><i data-el="confBar"></i></div><b data-el="confPct">—</b></div>
            <p class="hda-result__reason" data-el="resultReason"></p>
          </div>
        </div>
        <p class="hda-panel__lead" data-el="typesLead">違う種類なら、タップして選び直してください。</p>
        <div class="hda-types" data-el="types">
          <button type="button" class="hda-type" data-type="hachi"><span class="hda-type__swatch hda-type__swatch--hachi"><i></i></span><span class="hda-type__name">8割銅線</span><span class="hda-type__desc">黒色・断面の銅率 約80%</span><span class="hda-type__price"><b data-price="hachi"></b>円/kg</span></button>
          <button type="button" class="hda-type" data-type="roku"><span class="hda-type__swatch hda-type__swatch--roku"><i></i></span><span class="hda-type__name">6割銅線</span><span class="hda-type__desc">黒色・断面の銅率 約60%</span><span class="hda-type__price"><b data-price="roku"></b>円/kg</span></button>
          <button type="button" class="hda-type" data-type="f"><span class="hda-type__swatch hda-type__swatch--f"><i></i></span><span class="hda-type__name">Fケーブル（VA線）</span><span class="hda-type__desc">灰色・平たい形</span><span class="hda-type__price"><b data-price="f"></b>円/kg</span></button>
        </div>
        <div class="hda-weightrow">
          <div>
            <span class="hda-label">重量<small>おおよそでOK（0.1kg単位）</small></span>
            <div class="hda-weight">
              <button type="button" class="hda-weight__btn" data-delta="-1" aria-label="1kg減らす">−</button>
              <div class="hda-weight__field"><input type="number" data-el="weight" inputmode="decimal" min="0.1" step="0.1" value="10" aria-label="重量（kg）"><span class="hda-weight__unit">kg</span></div>
              <button type="button" class="hda-weight__btn" data-delta="1" aria-label="1kg増やす">＋</button>
            </div>
            <div class="hda-chips" data-el="chips"><button type="button" data-w="5">5kg</button><button type="button" data-w="10">10kg</button><button type="button" data-w="20">20kg</button><button type="button" data-w="50">50kg</button><button type="button" data-w="100">100kg</button></div>
          </div>
          <button type="button" class="hda-btn hda-btn--yellow hda-btn--pulse" data-el="start" disabled>査定結果を見る →</button>
        </div>
        <div class="hda-panel__foot">
          <span>単価はすべて税込・1kgあたり。袋・ドラムごとの重さでも構いません。</span>
          <button type="button" class="hda-linkbtn" data-el="retake">← 写真を撮り直す</button>
        </div>
      </div>
    </section>

    <!-- ========== 画面C: 査定結果・通常 ========== -->
    <section class="hda-screen hda-screen--result" data-screen="result" hidden>
      <div class="hda-screen__bg"><img src="${asset("bg-warehouse.jpg")}" alt=""></div>
      ${sideDeco}
      <img class="hda-abs hda-chara hda-chara--main hda-chara--thumbs" src="${asset("nakamura-full2.png")}" alt="">
      <img class="hda-abs hda-neon" src="${asset("neon-happy.png")}" alt="いい電線だ！ハッピー価格で I'LL BE BACK">
      <div class="hda-abs hda-steps" data-el="steps3">${stepsHtml(3).replace('<div class="hda-steps">', "").replace(/<\/div>\s*$/, "")}</div>
      <h2 class="hda-abs hda-h1">査定が完了しました！<span class="hda-h1sub">アップロードした電線の査定結果です。</span></h2>
      <div class="hda-abs hda-card" data-el="card">
        <div class="hda-panel__head"><span class="hda-check">✓</span>AI解析完了</div>
        <div class="hda-card__body">
          <div class="hda-card__photo">
            <img data-el="thumb2" src="${asset("ex-hachi.jpg")}" alt="">
            <p class="hda-card__caption" data-el="cardCaption">アップロードした写真</p>
            <p class="hda-card__name" data-el="cardName">—</p>
            <p class="hda-card__sub" data-el="cardSub">画像から推定</p>
          </div>
          <div class="hda-card__price">
            <span class="hda-price__label">参考査定金額</span>
            <div class="hda-price__amount"><span class="hda-price__yen">¥</span><div class="hda-reels" data-el="reels"></div></div>
            <p class="hda-price__tax">税込・概算</p>
            <p class="hda-price__note">※表示金額は「単価 × 重量」の概算です。</p>
          </div>
        </div>
      </div>
      <div class="hda-abs hda-detail">
        <div class="hda-detail__head">${ICON_DOC}査定内容</div>
        <dl class="hda-detail__rows">
          <div><dt>品目</dt><dd data-el="dType">—</dd></div>
          <div><dt>判定方法</dt><dd data-el="dMethod">—</dd></div>
          <div><dt>重量・単価</dt><dd data-el="dCalc">—</dd></div>
          <div><dt>買取方法</dt><dd>持込・宅配</dd></div>
        </dl>
        <p class="hda-detail__note">正確な重量・状態を確認後、買取金額が確定します。</p>
      </div>
      <div class="hda-abs hda-line-wrap"><a class="hda-btn hda-btn--line" data-el="lineLink2" href="#" target="_blank" rel="noopener"><span class="hda-line__icon">LINE</span><span>LINEで正式査定を依頼する</span><span class="hda-chev" aria-hidden="true">›</span></a></div>
      <div class="hda-abs hda-again-wrap"><button type="button" class="hda-btn hda-btn--ghost" data-el="again">別の写真で査定する<span class="hda-chev" aria-hidden="true">›</span></button></div>
      ${featuresHtml(false)}
    </section>

    <!-- ========== 画面D: 査定結果・最強（大当たり） ========== -->
    <section class="hda-screen hda-screen--jackpot" data-screen="jackpot" hidden>
      <div class="hda-jackpot-inner">
      <div class="hda-screen__bg"><img src="${asset("bg-cyber.jpg")}" alt=""></div>
      <img class="hda-abs hda-cyber-logo" src="${asset("cyber-logo.png")}" alt="AIサイボーグ中村の電線自動査定">
      <p class="hda-abs hda-recycle">RECYCLE<br>REUSE<br>CONNECT<br>TO<br>TOMORROW</p>
      <img class="hda-abs hda-hand" src="${asset("handwritten.png")}" alt="">
      <img class="hda-abs hda-cyborg" src="${asset("cyborg.png")}" alt="">
      <img class="hda-abs hda-cyber-bubble" src="${asset("cyber-bubble.png")}" alt="いい値がついたぞ！">
      <p class="hda-abs hda-future">HAPPY<br>CLEAN<br>EARTH<br>BRIGHT<br>FUTURE</p>
      <img class="hda-abs hda-gold-fx" src="${asset("cyber-gold-fx.png")}" alt="">
      <img class="hda-abs hda-cyber-complete" src="${asset("cyber-complete.png")}" alt="査定完了！">
      <img class="hda-abs hda-cyber-label" src="${asset("cyber-amount-label.png")}" alt="あなたの銅線の参考査定金額">
      <img class="hda-abs hda-cyber-frame" src="${asset("cyber-frame.png")}" alt="">
      <div class="hda-abs hda-gold" data-el="gold" aria-label="参考査定金額"></div>
      <img class="hda-abs hda-cyber-tax" src="${asset("cyber-tax.png")}" alt="税込・概算">
      <img class="hda-abs hda-cyber-catch" src="${asset("cyber-catch.png")}" alt="その銅線を、価値に変えよう。">
      <a class="hda-abs hda-cyber-line" data-el="lineLink3" href="#" target="_blank" rel="noopener"><img src="${asset("cyber-line.png")}" alt="LINEで買取を申し込む"></a>
      <button type="button" class="hda-abs hda-cyber-retry" data-el="retry"><img src="${asset("cyber-retry.png")}" alt="もう一度査定する"></button>
      <p class="hda-abs hda-cyber-note">※表示金額は「単価 × 重量」の概算です。実際の買取金額は現物確認後に確定します。</p>
      </div>
    </section>
    <div class="hda-cutin-fx" data-el="cutinFx" hidden aria-hidden="true"><span class="hda-cutin-fx__flash"></span><span class="hda-cutin-fx__stripes"></span><span class="hda-cutin-fx__text">JACKPOT!!</span></div>
  </div>
  `;

  /* ---------------- 本体 ---------------- */
  function mount(root) {
    if (root.dataset.hdaMounted) return;
    root.dataset.hdaMounted = "1";
    root.classList.add("hd-assess");
    root.innerHTML = TEMPLATE;

    const CFG = window.HAPPY_CONFIG || {};
    const PRICES = Object.assign({ hachi: 1660, roku: 1400, f: 860 }, CFG.prices || {});

    // スタッフ用: URLで単価を一時上書き ?p8=1700&p6=1450&pf=900 、大当たり強制 ?happy=1 / 0
    const qs = new URLSearchParams(location.search);
    const ov = { hachi: qs.get("p8"), roku: qs.get("p6"), f: qs.get("pf") };
    Object.keys(ov).forEach((k) => { if (ov[k] && !isNaN(+ov[k])) PRICES[k] = +ov[k]; });
    const forcedGogo = qs.get("happy");

    const TYPES = {
      hachi: { key: "hachi", name: "8割銅線", tag: "黒色電線・断面の銅率 約80%" },
      roku: { key: "roku", name: "6割銅線", tag: "黒色電線・断面の銅率 約60%" },
      f: { key: "f", name: "Fケーブル（VA線）", tag: "灰色電線・平たい形" }
    };

    const state = { dataUrl: null, base64: null, canvas: null, aiType: null, type: null, confidence: 0, weight: 10, amount: 0, spinning: false, mode: "photo", screen: "upload" };

    const el = (name) => root.querySelector(`[data-el="${name}"]`);
    const $$ = (s) => Array.from(root.querySelectorAll(s));
    const yen = (n) => Math.round(n).toLocaleString("ja-JP");
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const vibrate = (pat) => { try { if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(pat); } catch (_) {} };

    /* 固定幅キャンバスを枠の幅に合わせて縮小 */
    const canvas = el("canvas");
    function fitCanvas() {
      const w = root.clientWidth || CANVAS_W;
      const scale = Math.min(1, w / CANVAS_W);
      const screen = root.querySelector(`.hda-screen[data-screen="${state.screen}"]`);
      const h = screen ? screen.offsetHeight : 1400;
      canvas.style.transform = `scale(${scale})`;
      root.style.height = `${Math.round(h * scale)}px`;
    }
    if (window.ResizeObserver) new ResizeObserver(fitCanvas).observe(root); else window.addEventListener("resize", fitCanvas);

    function goScreen(name) {
      state.screen = name;
      $$(".hda-screen").forEach((s) => { s.hidden = s.dataset.screen !== name; });
      if (name !== "jackpot") { const jp = root.querySelector('.hda-screen[data-screen="jackpot"]'); jp.classList.remove("is-cutin", "is-enter", "is-win"); }
      fitCanvas();
      const off = typeof CFG.scrollOffset === "number" ? CFG.scrollOffset : 80;
      const top = root.getBoundingClientRect().top + window.scrollY - off;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }

    /* 価格 */
    function renderPrices() {
      $$("[data-price]").forEach((e) => { e.textContent = yen(PRICES[e.dataset.price]); });
      el("exPrice").textContent = `${yen(PRICES.hachi)}円/kg`;
      el("exAmount").textContent = `¥${yen(PRICES.hachi * 20)}`;
    }
    async function fetchRemotePrices() {
      if (!CFG.pricesEndpoint) return;
      try {
        const res = await fetch(CFG.pricesEndpoint, { cache: "no-store" });
        if (!res.ok) throw new Error(res.status);
        const j = await res.json();
        if (j && j.prices) {
          ["hachi", "roku", "f"].forEach((k) => { if (typeof j.prices[k] === "number" && j.prices[k] > 0) PRICES[k] = j.prices[k]; });
          renderPrices();
        }
      } catch (e) { console.warn("[happy-assess] 価格の自動取得に失敗。config.js の単価を使用します。", e); }
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
      fitCanvas();
    }

    /* 判定 */
    async function classifyViaApi() {
      const res = await fetch(CFG.classifyEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: state.base64, media_type: "image/jpeg" }) });
      if (!res.ok) throw new Error("API " + res.status);
      const j = await res.json();
      if (!j || !j.category) throw new Error("bad response");
      return { type: j.category, confidence: Number(j.confidence) || 0, reason: j.reason || "", subject: j.subject || (j.is_cable === false ? "other" : "cable"), source: "ai" };
    }
    // ブラウザ内簡易判定（APIなしのフォールバック）
    // 1) 灰色が支配的 → Fケーブル
    // 2) 銅色の丸い断面ブロブを抽出し、周囲が黒い被覆だけなら単心（8割候補）、他の芯線や介在物が見えれば多心（6割）
    // 3) 単心は「被覆の厚み / 導体半径」から銅の重量比を推定し、0.72以上を8割とする
    // 肌色マスクの最大連結成分の形状で「頭」らしさを判定
    //  目・口・眼鏡などの穴は外接矩形内で埋めてから、面積12%以上・充填率.40以上・縦横比.5〜2 を要求
    //  （木目やベージュの床は細長い／小さい／穴だらけなので除外される）
    function isHeadBlob(mask0, W, H) {
      const N = W * H, lab = new Int32Array(N), queue = new Int32Array(N);
      const dil = (m) => { const o = new Uint8Array(N); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (m[i] || (y > 0 && m[i - W]) || (y < H - 1 && m[i + W]) || (x > 0 && m[i - 1]) || (x < W - 1 && m[i + 1])) o[i] = 1; } return o; };
      const ero = (m) => { const o = new Uint8Array(N); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (m[i] && (y === 0 || m[i - W]) && (y === H - 1 || m[i + W]) && (x === 0 || m[i - 1]) && (x === W - 1 || m[i + 1])) o[i] = 1; } return o; };
      let mask = mask0; for (let k = 0; k < 3; k++) mask = dil(mask); for (let k = 0; k < 3; k++) mask = ero(mask);
      let best = null, nid = 0;
      for (let s0 = 0; s0 < N; s0++) {
        if (!mask[s0] || lab[s0]) continue;
        nid++; let qh = 0, qt = 0; queue[qt++] = s0; lab[s0] = nid;
        let area = 0, minx = W, maxx = 0, miny = H, maxy = 0;
        while (qh < qt) {
          const i = queue[qh++]; const y = (i / W) | 0, x = i - y * W;
          area++; if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
          const nb = [y > 0 ? i - W : -1, y < H - 1 ? i + W : -1, x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1];
          for (const j of nb) { if (j >= 0 && mask[j] && !lab[j]) { lab[j] = nid; queue[qt++] = j; } }
        }
        if (!best || area > best.area) best = { id: nid, area, minx, maxx, miny, maxy };
      }
      if (!best) return false;
      // 外接矩形（1px余白）内で、ブロブ外から到達できない画素＝穴 を埋めた面積を求める
      const bw = best.maxx - best.minx + 1, bh = best.maxy - best.miny + 1, BW = bw + 2, BH = bh + 2;
      const inside = new Uint8Array(BW * BH), reach = new Uint8Array(BW * BH), q2 = new Int32Array(BW * BH);
      for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) if (lab[(best.miny + y) * W + best.minx + x] === best.id) inside[(y + 1) * BW + x + 1] = 1;
      let qh = 0, qt = 0; q2[qt++] = 0; reach[0] = 1;
      while (qh < qt) {
        const i = q2[qh++]; const y = (i / BW) | 0, x = i - y * BW;
        const nb = [y > 0 ? i - BW : -1, y < BH - 1 ? i + BW : -1, x > 0 ? i - 1 : -1, x < BW - 1 ? i + 1 : -1];
        for (const j of nb) { if (j >= 0 && !inside[j] && !reach[j]) { reach[j] = 1; q2[qt++] = j; } }
      }
      let filled = 0; for (let i = 0; i < BW * BH; i++) if (!reach[i]) filled++;
      const fill = filled / (bw * bh), asp = bw / bh;
      return filled / N >= .12 && fill >= .4 && asp >= .5 && asp <= 2;
    }
    function classifyLocal() {
      const src = state.canvas;
      const W = 320, H = Math.max(1, Math.round((src.height / src.width) * W));
      const c = document.createElement("canvas"); c.width = W; c.height = H;
      const ctx = c.getContext("2d"); ctx.drawImage(src, 0, 0, W, H);
      const px = ctx.getImageData(0, 0, W, H).data;
      const N = W * H;
      const copper = new Uint8Array(N), sheath = new Uint8Array(N), colored = new Uint8Array(N), skinM = new Uint8Array(N);
      let gray = 0, dark = 0, cop = 0;
      for (let i = 0; i < N; i++) {
        const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        const lum = .299 * r + .587 * g + .114 * b, sat = mx === 0 ? 0 : (mx - mn) / mx;
        const isC = r > 95 && r > g * 1.25 && g >= b * .95 && sat > .3 && lum > 50;
        // 肌色（明るく低〜中彩度で R>G>B）: 頭・顔の判定に使う。顔は銅色判定にも掛かるので銅より先に見る
        if (lum > 120 && r > g && g > b && r - b > 25 && r - b < 130 && sat > .15 && sat < .5) skinM[i] = 1;
        if (isC) { copper[i] = 1; cop++; continue; }
        if (lum < 70) dark++;
        if (sat < .16 && lum >= 95 && lum <= 215) gray++;
        if (lum < 90 || (sat < .2 && lum < 150)) sheath[i] = 1;
        else if (sat > .3) colored[i] = 1;
      }
      const gR = gray / N, dR = dark / N, cR = cop / N;
      // 肌色の最大ブロブが「大きく・丸く・詰まっている」→ 人の頭（中村）扱い。木目やベージュの床は細長い／穴だらけなので除外される
      if (isHeadBlob(skinM, W, H)) return { type: "unknown", subject: "bald_head", confidence: .3, reason: "電線ではなく、人の頭のようです。電線の断面が見えるように撮ってください。", source: "local" };
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
        // 銅の断面が無い: 肌色が広く写っていれば「頭（中村）」、それ以外は「電線ではない」扱い
        if (dR < .35 && gR < .25) return { type: "unknown", subject: "other", confidence: .25, reason: "電線が写っていないようです。電線の切り口が見えるように撮り直してください。", source: "local" };
        return { type: "unknown", subject: "cable", confidence: .2, reason: "断面（切り口）がはっきり写っていないため判別できませんでした。切り口が見えるように撮るか、下から種類を選んでください。", source: "local" };
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
      state.mode = "photo";
      showResult(result);
      goScreen("analyze");
      showReaction();
    }
    function showResult(r) {
      state.aiType = TYPES[r.type] ? r.type : null;
      state.confidence = r.confidence;
      el("result").hidden = false;
      el("result").classList.toggle("is-unknown", !state.aiType);
      el("resultHeadText").textContent = r.source === "ai" ? "AI解析完了" : "AI解析完了（簡易判定）";
      el("analyzeTitle").firstChild.textContent = state.aiType ? "AI解析が完了しました！" : "種類を選んでください";
      el("analyzeSub").textContent = state.aiType ? "種類を確認して、重量を入力してください。" : "写真からは判別できませんでした。近い種類をタップしてください。";
      // 電線以外(other) / ハゲ頭(bald_head) のリアクション: 解析完了の表示後に人物とネオンキャッチを差し替える（showReaction）
      const react = state.aiType ? "" : (r.subject === "bald_head" ? "bald" : r.subject === "other" ? "other" : "");
      state.react = react;
      clearTimeout(state.reactTimer);
      el("analyzeChara").src = asset("nakamura-full1.png");
      el("analyzeChara").classList.remove("hda-chara--react");
      el("analyzeNeon").hidden = true;
      el("analyzeBubbleWrap").hidden = false;
      // 見出しはキャッチと内容が重複するので出さない。補足文（撮り直しの案内）だけ残す
      el("analyzeTitle").firstChild.textContent = react ? "" : (state.aiType ? "AI解析が完了しました！" : "種類を選んでください");
      el("analyzeTitle").classList.toggle("is-subonly", !!react);
      if (react === "bald") el("analyzeSub").textContent = "中村は買い取れません。電線の切り口が見えるように撮り直してください。";
      else if (react === "other") el("analyzeSub").textContent = "電線が写っていません。電線の切り口が見えるように撮り直してください。";
      el("analyzeBubble").innerHTML = state.aiType ? "<em>AI</em>解析が<br>完了したぞ！" : "もう少し<br>近づいて撮ってくれ！";
      el("resultName").textContent = state.aiType ? TYPES[state.aiType].name : react === "bald" ? "中村（電線ではありません）" : react === "other" ? "電線ではありません" : "判別できませんでした";
      el("resultTag").textContent = state.aiType ? TYPES[state.aiType].tag : "下から種類を選んでください";
      const pct = Math.round(Math.max(0, Math.min(1, r.confidence)) * 100);
      el("confPct").textContent = pct + "%";
      el("confBar").style.width = "0%";
      setTimeout(() => { el("confBar").style.width = pct + "%"; }, 80);
      el("resultReason").textContent = r.reason || "";
      if (r.fallback) toast("AIサーバーに接続できないため、簡易判定で表示しています");
      $$("[data-el=types] .hda-type").forEach((b) => b.classList.toggle("is-ai", b.dataset.type === state.aiType));
      el("typesLead").textContent = "違う種類なら、タップして選び直してください。";
      el("retake").textContent = "← 写真を撮り直す";
      setType(state.aiType);
    }
    // 解析完了画面が出てから一拍おいて、人物差し替え＋ネオンキャッチをポップイン
    function showReaction() {
      const react = state.react; if (!react) return;
      state.reactTimer = setTimeout(() => {
        if (state.screen !== "analyze" || state.react !== react) return;
        el("analyzeBubbleWrap").hidden = true;
        el("analyzeChara").src = asset(react === "bald" ? "nakamura-self.png" : "nakamura-shock.png");
        el("analyzeChara").classList.add("hda-chara--react");
        const neon = el("analyzeNeon");
        neon.src = asset(react === "bald" ? "neon-nakamura.png" : "neon-wrong.png");
        neon.alt = react === "bald" ? "それは中村だ！ハッピー価格で I'LL BE BACK" : "それは違う！ハッピー価格で I'LL BE BACK";
        neon.hidden = false;
        Sound.reaction();
        vibrate([40, 60, 40]);
      }, 900);
    }
    function setType(key) {
      state.type = TYPES[key] ? key : null;
      $$("[data-el=types] .hda-type").forEach((b) => b.classList.toggle("is-selected", b.dataset.type === state.type));
      el("start").disabled = !state.type;
      fitCanvas();
    }
    /* 重量 */
    function setWeight(w) {
      w = Math.round(Math.max(.1, Math.min(99999, w)) * 10) / 10;
      state.weight = w;
      const inp = el("weight");
      if (document.activeElement !== inp || String(w) !== inp.value) inp.value = w;
      $$("[data-el=chips] button").forEach((b) => b.classList.toggle("is-on", +b.dataset.w === w));
    }

    /* 効果音（WebAudio 合成・独自音）
     * 方向性: サイボーグ／ダーク SF 映画のような緊張感。
     *  - 低いドローン（回転中）、金属を打つ打撃音（リール停止）、サーボの駆動音（回転中のカチカチ）、
     *    上昇するライザー＋衝撃音（カットイン）、暗い短調のシンセ和音と金属連打（大当たり）
     *  既存作品のメロディ・リズムは使わない。 */
    const Sound = {
      ctx: null, on: false, _drone: null, _noise: null,
      init() {
        if (!this.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) this.ctx = new AC(); }
        if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
        if (this.ctx && !this._noise) { // ホワイトノイズ素材（2秒）
          const len = this.ctx.sampleRate * 2, buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0);
          for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
          this._noise = buf;
        }
      },
      _out(gain, t, dur, curve) { // 減衰付きゲイン
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(gain, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        g.connect(this.ctx.destination);
        return g;
      },
      tone(freq, dur, type = "sine", gain = .06, when = 0, detune = 0, slideTo = null) {
        if (!this.on || !this.ctx) return;
        const t = this.ctx.currentTime + when, o = this.ctx.createOscillator();
        o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
        if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
        o.connect(this._out(gain, t, dur)); o.start(t); o.stop(t + dur + .05);
      },
      noise(dur, gain = .08, when = 0, filterFreq = 1200, q = 1, type = "bandpass") {
        if (!this.on || !this.ctx || !this._noise) return;
        const t = this.ctx.currentTime + when, src = this.ctx.createBufferSource(); src.buffer = this._noise;
        const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(filterFreq, t); f.Q.value = q;
        src.connect(f).connect(this._out(gain, t, dur)); src.start(t); src.stop(t + dur + .05);
      },
      // 金属を打つ音: 非整数倍の部分音 + 高域ノイズ
      metal(base = 620, when = 0, gain = .12, dur = .9) {
        [1, 1.51, 2.09, 2.77, 3.63].forEach((r, i) => this.tone(base * r, dur * (1 - i * .14), "sine", gain / (i + 1.4), when));
        this.noise(.12, gain * .9, when, 4200, .8, "highpass");
      },
      // 低い衝撃音（サブベース + 胴鳴り）
      impact(when = 0, gain = .35) {
        this.tone(140, .5, "sine", gain, when, 0, 38);
        this.tone(55, 1.2, "triangle", gain * .8, when + .02);
        this.noise(.35, gain * .5, when, 220, .7, "lowpass");
      },
      // サーボの駆動音（回転中のカチカチ）
      tick() { this.noise(.035, .05, 0, 2600, 2); this.tone(180, .04, "square", .02); },
      // リアクション（電線以外／中村）: 金属一撃＋警告ブザー
      reaction() { this.metal(420, 0, .14, .8); this.impact(.02, .3); this.tone(220, .18, "square", .05, .12); this.tone(165, .22, "square", .05, .3); },
      // リール停止: 金属の打撃
      stop() { this.metal(520 + Math.random() * 60, 0, .11, .7); this.tone(70, .25, "sine", .12); },
      // 回転中のドローン（開始/停止）
      droneStart() {
        if (!this.on || !this.ctx || this._drone) return;
        const t = this.ctx.currentTime;
        const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(.07, t + .6); g.connect(this.ctx.destination);
        const f = this.ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 420; f.Q.value = 6; f.connect(g);
        const lfo = this.ctx.createOscillator(); lfo.frequency.value = 2.2; const lg = this.ctx.createGain(); lg.gain.value = 260; lfo.connect(lg).connect(f.frequency); lfo.start(t);
        const oscs = [[41.2, "sawtooth", 0], [41.2, "sawtooth", 9], [61.7, "square", -5]].map(([fr, ty, dt]) => { const o = this.ctx.createOscillator(); o.type = ty; o.frequency.value = fr; o.detune.value = dt; o.connect(f); o.start(t); return o; });
        this._drone = { g, oscs, lfo };
      },
      droneStop() {
        if (!this._drone || !this.ctx) return;
        const t = this.ctx.currentTime, d = this._drone; this._drone = null;
        d.g.gain.cancelScheduledValues(t); d.g.gain.setValueAtTime(d.g.gain.value || .07, t); d.g.gain.exponentialRampToValueAtTime(.0001, t + .5);
        d.oscs.forEach((o) => o.stop(t + .6)); d.lfo.stop(t + .6);
      },
      // カットイン: ライザー（上昇）→ 衝撃 → 金属の一撃
      peka() {
        this.tone(60, .9, "sawtooth", .09, 0, 0, 480);
        this.tone(60, .9, "sawtooth", .09, 0, 7, 484);
        this.noise(.9, .06, 0, 800, .6, "highpass");
        this.impact(.92, .4);
        this.metal(300, .94, .18, 1.6);
        for (let i = 0; i < 6; i++) this.tone(1200 + i * 90, .08, "square", .02, .1 + i * .12); // 警告ブザー的な連打
      },
      // 通常の査定完了: 低い和音 + 短い金属音
      done() {
        this.tone(110, .9, "sawtooth", .05); this.tone(164.8, .9, "sawtooth", .04, .0, 5);
        this.metal(880, .05, .06, .5);
        this.tone(220, .3, "sine", .05, .1, 0, 165);
      },
      // 大当たり: 暗い短調の重厚な和音を刻む + 金属連打 + 最後に衝撃（約2.6秒・独自パターン）
      win() {
        const q = .3; // 拍
        const stab = (root, when, len = .26, g = .07) => { [1, 1.5, 2, 2.38].forEach((r, i) => this.tone(root * r, len, i < 2 ? "sawtooth" : "square", g / (i + 1), when, (i % 2 ? 6 : -6))); this.noise(.06, .05, when, 600, 1, "lowpass"); };
        // 拍パターン（x=打, .=休）: x . x x . x . . | x . x x . x . .  → Am(110) → F(87.3) → G(98) → Am
        const pattern = [1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0];
        const roots = [110, 110, 110, 110, 110, 87.3, 87.3, 87.3, 98, 98, 98, 98, 110, 110, 110, 110];
        pattern.forEach((hit, i) => { if (hit) { stab(roots[i], i * q * .5); this.metal(420 + (i % 3) * 110, i * q * .5, .08, .5); } });
        this.tone(55, 2.6, "triangle", .07); // 支えの低音
        this.impact(2.45, .45);
        this.metal(240, 2.47, .2, 2.0);
        for (let i = 0; i < 10; i++) this.tone(1600 + i * 180, .05, "sine", .02, 2.5 + i * .04); // 余韻のきらめき（控えめ）
      }
    };

    /* ---------------- 結果表示（リール） ---------------- */
    // 通常版: ピンクの数字リール
    function buildReels(container, amount, compactAt) {
      const str = String(Math.max(0, Math.round(amount)));
      container.innerHTML = "";
      container.classList.toggle("is-compact", str.length >= compactAt);
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
        reel.appendChild(strip); container.appendChild(reel);
        if (remaining > 1 && (remaining - 1) % 3 === 0) { const sep = document.createElement("span"); sep.className = "hda-reel-sep"; sep.textContent = ","; container.appendChild(sep); }
      });
    }
    // 最強版: 金色の数字画像リール
    function buildGoldReels(container, amount) {
      const str = String(Math.max(0, Math.round(amount)));
      container.innerHTML = "";
      container.classList.toggle("is-compact", str.length >= 6);
      const yenImg = document.createElement("img"); yenImg.className = "hda-gold__yen"; yenImg.src = asset("digits/yen.png"); yenImg.alt = "¥";
      container.appendChild(yenImg);
      const digits = str.split("");
      digits.forEach((d, i) => {
        const remaining = digits.length - i;
        const reel = document.createElement("div"); reel.className = "hda-reel";
        const strip = document.createElement("div"); strip.className = "hda-reel__strip";
        const loops = 2 + i;
        let html = "";
        for (let l = 0; l < loops; l++) for (let n = 0; n < 10; n++) html += `<img src="${asset(`digits/${n}.png`)}" alt="">`;
        for (let n = 0; n <= +d; n++) html += `<img src="${asset(`digits/${n}.png`)}" alt="${n === +d ? d : ""}">`;
        strip.innerHTML = html;
        strip.dataset.target = loops * 10 + +d;
        reel.appendChild(strip); container.appendChild(reel);
        if (remaining > 1 && (remaining - 1) % 3 === 0) { const sep = document.createElement("img"); sep.className = "hda-reel-sep"; sep.src = asset("digits/comma.png"); sep.alt = ","; container.appendChild(sep); }
      });
    }
    async function spinStrips(container) {
      const strips = Array.from(container.querySelectorAll(".hda-reel__strip"));
      const H = strips.length ? strips[0].firstElementChild.offsetHeight || 96 : 96;
      strips.forEach((s) => { s.style.transition = "none"; s.style.transform = "translateY(0)"; s.classList.add("is-blur"); });
      void container.offsetWidth;
      const base = 1300, stagger = 380;
      Sound.droneStart();
      const ticker = setInterval(() => Sound.tick(), 90);
      strips.forEach((s, i) => {
        const dur = base + i * stagger;
        s.style.transition = `transform ${dur}ms cubic-bezier(.12,.75,.25,1.04)`;
        s.style.transform = `translateY(-${(+s.dataset.target) * H}px)`;
        setTimeout(() => { s.classList.remove("is-blur"); Sound.stop(); }, dur);
      });
      await sleep(base + (strips.length - 1) * stagger + 80);
      clearInterval(ticker);
      Sound.droneStop();
    }
    function currentScale() {
      const m = /scale\(([\d.]+)\)/.exec(canvas.style.transform || "");
      return m ? parseFloat(m[1]) || 1 : 1;
    }

    function decideHappy() {
      const chance = typeof CFG.happyChance === "number" ? CFG.happyChance : .33;
      return forcedGogo === "1" ? true : forcedGogo === "0" ? false : Math.random() < chance;
    }

    async function showOutcome() {
      if (state.spinning || !state.type) return;
      state.spinning = true;
      Sound.init();
      state.amount = Math.floor(PRICES[state.type] * state.weight);
      const happy = decideHappy();
      const methodText = "写真によるAI査定（断面から判定）";

      // まず通常の査定結果
      hideCutin();
      el("thumb2").src = state.dataUrl || asset("ex-hachi.jpg");
      el("cardCaption").textContent = "アップロードした写真";
      el("cardName").textContent = TYPES[state.type].name;
      el("cardSub").textContent = state.aiType === state.type ? "画像から推定" : "手動で選択";
      el("dType").textContent = `${TYPES[state.type].name}（${TYPES[state.type].tag}）`;
      el("dMethod").textContent = methodText;
      el("dCalc").textContent = `約 ${state.weight} kg × ${yen(PRICES[state.type])} 円/kg（税込）`;
      buildReels(el("reels"), state.amount, 6);
      goScreen("result");
      await sleep(350);
      await spinStrips(el("reels"));
      Sound.done();

      if (happy) {
        // たまに出るカットイン: 閃光 → 斜めワイプで最強バージョンが割り込む → 金色の数字が回る
        await sleep(500);
        await cutIn();
      } else {
        confetti(el("card"), 40);
      }
      state.spinning = false;
    }

    const jackpot = root.querySelector('.hda-screen[data-screen="jackpot"]');
    async function cutIn() {
      const fx = el("cutinFx");
      jackpot.classList.remove("is-win", "is-enter");
      buildGoldReels(el("gold"), state.amount);
      Sound.peka();
      fx.hidden = false; fx.classList.remove("is-run"); void fx.offsetWidth; fx.classList.add("is-run");
      await sleep(180);
      jackpot.hidden = false;
      jackpot.classList.add("is-cutin", "is-enter");
      vibrate([40, 40, 40, 40, 200]);
      window.scrollTo({ top: Math.max(0, root.getBoundingClientRect().top + window.scrollY - (typeof CFG.scrollOffset === "number" ? CFG.scrollOffset : 80)), behavior: "smooth" });
      await sleep(700);
      fx.hidden = true;
      await spinStrips(el("gold"));
      jackpot.classList.add("is-win");
      Sound.win();
      confetti(el("gold"), 170);
    }
    function hideCutin() {
      jackpot.hidden = true;
      jackpot.classList.remove("is-cutin", "is-enter", "is-win");
      const fx = el("cutinFx"); fx.hidden = true; fx.classList.remove("is-run");
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
      state.dataUrl = state.base64 = null; state.aiType = state.type = null; state.canvas = null; state.mode = "photo";
      clearTimeout(state.reactTimer); state.react = "";
      el("preview").hidden = true; el("preview").src = "";
      el("dropInner").hidden = false;
      el("drop").classList.remove("has-image");
      el("classify").disabled = true;
      el("file").value = "";
      goScreen("upload");
    }

    /* イベント */
    const fileInput = el("file"), drop = el("drop");
    fileInput.addEventListener("change", () => handleFile(fileInput.files[0]));
    drop.addEventListener("click", (e) => { if (e.target !== fileInput) { e.preventDefault(); fileInput.removeAttribute("capture"); fileInput.click(); } });
    ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("is-over"); }));
    ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("is-over"); }));
    drop.addEventListener("drop", (e) => { const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) handleFile(f); });


    el("classify").addEventListener("click", runClassify);
    $$("[data-el=types] .hda-type").forEach((b) => b.addEventListener("click", () => setType(b.dataset.type)));
    el("retake").addEventListener("click", resetAll);

    $$(".hda-weight__btn").forEach((b) => b.addEventListener("click", () => setWeight(state.weight + +b.dataset.delta)));
    el("weight").addEventListener("input", (e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) setWeight(v); });
    el("weight").addEventListener("blur", () => setWeight(state.weight));
    el("weight").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); el("start").click(); } });
    $$("[data-el=chips] button").forEach((b) => b.addEventListener("click", () => setWeight(+b.dataset.w)));

    el("start").addEventListener("click", () => {
      if (!state.type) { toast("種類を選んでください"); return; }
      if (!(state.weight > 0)) { toast("重量を入力してください"); return; }
      showOutcome();
    });
    el("retry").addEventListener("click", () => { hideCutin(); state.screen = "result"; fitCanvas(); window.scrollTo({ top: Math.max(0, root.getBoundingClientRect().top + window.scrollY - (typeof CFG.scrollOffset === "number" ? CFG.scrollOffset : 80)), behavior: "smooth" }); });
    el("again").addEventListener("click", resetAll);

    const sb = el("sound");
    try { Sound.on = localStorage.getItem("hd_sound") === "1"; } catch (_) {}
    const renderSound = () => { sb.textContent = Sound.on ? "🔊" : "🔇"; sb.setAttribute("aria-pressed", String(Sound.on)); };
    renderSound();
    sb.addEventListener("click", () => {
      Sound.on = !Sound.on; Sound.init(); renderSound();
      try { localStorage.setItem("hd_sound", Sound.on ? "1" : "0"); } catch (_) {}
      if (Sound.on) Sound.done();
    });

    // LINEボタン（config.lineUrl が無ければ非表示）
    ["lineLink1", "lineLink2", "lineLink3"].forEach((k) => { if (CFG.lineUrl) el(k).href = CFG.lineUrl; else el(k).hidden = true; });

    renderPrices();
    fetchRemotePrices();
    setWeight(10);
    fitCanvas();
    // 画像の読み込み完了後に高さを取り直す
    $$("img").forEach((im) => { if (!im.complete) im.addEventListener("load", fitCanvas, { once: true }); });
    setTimeout(fitCanvas, 600);
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
