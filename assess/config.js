/* =====================================================================
 * ハッピーデンセン AI自動査定ウィジェット — 設定ファイル
 * 価格を変えるときはここだけ編集してください（単位: 円/kg 税込）
 * 出典: https://colors.main.jp/ 「被覆銅線買取価格」
 * ===================================================================== */
window.HAPPY_CONFIG = {
  prices: {
    hachi: 1660, // 8割銅線（黒色電線・断面の銅率 約80%）
    roku: 1400,  // 6割銅線（黒色電線・断面の銅率 約60%）
    f: 860       // Fケーブル / VA線（灰色電線）
  },
  pricesUpdated: "2026-09-03",
  priceSource: "https://colors.main.jp/",

  // HAPPYランプ（ジャグラー風）が点灯する確率（0〜1）。査定スタートを押すたびに抽選。
  happyChance: 0.33,

  // AI判定API（Cloudflare Worker）のURL。空欄のときはブラウザ内の簡易判定で動きます。
  // 例: "https://happy-densen-api.<account>.workers.dev/api/classify"
  classifyEndpoint: "",
  // 価格自動取得API。空欄のときは上の prices を使います。
  // 例: "https://happy-densen-api.<account>.workers.dev/api/prices"
  pricesEndpoint: "",

  // ステップ切替時にウィジェット上端を画面のどこに合わせるか（固定ヘッダーの高さ分、px）
  scrollOffset: 80
};
