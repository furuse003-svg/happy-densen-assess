# fn_ハッピーデンセン銅線買取 — AI自動査定ウィジェット

ハッピーデンセン（北海道プリオン株式会社 / パワフルトレードセンター系）の被覆銅線買取LP
https://lp.used-cable.net/ に設置する査定ウィジェット。フレームワーク無しの静的HTML/CSS/JS + Cloudflare Worker。

## 仕様の要点

- 流れ: 写真アップ → AI判別（8割銅線 / 6割銅線 / Fケーブル） → 重量手入力 → 「単価×重量」をスロット演出で表示
- 単価の出典は https://colors.main.jp/ の「被覆銅線買取価格」（2026-09-03時点: 8割1,660 / 6割1,400 / F 860 円/kg税込）
- **埋め込み型・レスポンシブ**（実際の設置先はLPではなくレスポンシブな公式サイト、2026-09-04指示）: `<div id="happy-assess"></div><script src="/assess/embed.js" defer>` を貼るだけ。最大幅720px、560px以上でPC向けサイズ。LINE/電話CTAは**含めない**（サイト側で配置）。`assess/embed.js` がHTMLテンプレート+ロジック、`assess/style.css` は `.hd-assess` 配下に `hda-` 接頭辞でスコープ（LPのCSSと衝突させない）。`demo.html` がレスポンシブ模擬サイトの確認ページ
- 設定は `assess/config.js` に集約。`classifyEndpoint` 未設定時は `classifyLocal`（銅断面ブロブ抽出→単心/多心判定→被覆厚比で8割/6割）にフォールバック。`test-fixtures/` の7枚で回帰確認できる（Python版プロトタイプは scratchpad の heur3.py、同じアルゴリズム）
- ランプはサイトロゴの「ハッピー」画像（`assess/img/happy-logo.png`、logo.png左半分を切出し）。GOGO/HAPPY!の文字ではない（ユーザー指定）。ジャグラー風で、査定スタート押下ごとに `happyChance`(既定0.33)で抽選、点灯はリール回転開始の瞬間に固定（後告知なし・2026-09-04指示）。`?happy=1|0` で強制。点灯有無で金額は変わらない旨を画面に明記
- デザイン基盤は**デジタル庁デザインシステム（DADS v2.0.1 トークン、2026-09-05指示）**: 本文16px/最小14px・行間1.7・8pxグリッド・角丸8/12/16・ボタン48/56px・タップ44px・フォーカス黄#FFD43D+黒4px・本文#1A1A1A/補足#767676/境界#949494。ブランド色ピンク `#ff1874` / ネイビー `#00156d` はアクセント、文字用ピンクは `#d40f5e`（4.5:1確保）。筐体（スロット）は演出のため例外
- 金額表示は射倖心を煽る方向で意図的に派手にしている。筐体はジャグラー風（2026-09-05指示: クローム縁ピンク筐体・黒リールパネル・ペイライン・左下ランプ・赤LED WEIGHT/PRICE・赤黄緑ストップボタン・再抽選は全幅の大きな「もう一度試す」ボタン=レバーは分かりにくいと指摘され廃止）。効果音は独自合成（ペカ告知音・大当たりファンファーレ）で既存機種の音は使わない

## Worker（worker/）

- `POST /api/classify`: `@anthropic-ai/sdk` の `client.beta.messages.create`、`claude-opus-5`、structured outputs(json_schema)、`fallbacks: "default"`
- `GET /api/prices`: colors.main.jp をスクレイプして単価抽出。`parsePrices` の正規表現は保存済みHTMLで動作確認済み
- 型チェック: `cd worker && npm install && npm run typecheck`。デプロイは README 参照（未デプロイ・APIキー未設定）

## ローカル確認

`.claude/launch.json` の `happy-densen`（python http.server, port 8765）。ブラウザでファイル選択ができない環境では
JSで canvas→File を `[data-el=file]` に流し込んで `change` を発火させるとテストできる。
