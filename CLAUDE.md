# fn_ハッピーデンセン銅線買取 — AI自動査定ウィジェット

ハッピーデンセン（北海道プリオン株式会社 / パワフルトレードセンター系）の被覆銅線買取LP
https://lp.used-cable.net/ に設置する査定ウィジェット。フレームワーク無しの静的HTML/CSS/JS + Cloudflare Worker。

## 仕様の要点

- 流れ: 写真アップ → AI判別（8割銅線 / 6割銅線 / Fケーブル） → 重量手入力 → 「単価×重量」をリール演出で表示。タブ「重さで査定」は写真なしで種類を手選択→重量へ
- 単価の出典は https://colors.main.jp/ の「被覆銅線買取価格」（2026-09-03時点: 8割1,660 / 6割1,400 / F 860 円/kg税込）。**出典は画面に表示しない**（2026-09-05指示）
- **埋め込み型・レスポンシブ**: `<div id="happy-assess"></div><script src="/assess/embed.js" defer>` を貼るだけ。最大幅1120px、900px以上で2カラム（右にサイド）。`assess/embed.js` がHTMLテンプレート+ロジック、`assess/style.css` は `.hd-assess` 配下に `hda-` 接頭辞でスコープ。`demo.html` がレスポンシブ模擬サイト、`widget.html` が単体、`index.html` は `build_share.py` が生成する公開デモ
- **デザイン（2026-09-18 大幅変更）**: 参考画像 `画像/AI中村画面 (1).jpg`・パーツ `画像/nakamura_parts/` に準拠。暗い倉庫背景（img/bg-warehouse.jpg）× 黄色見出し画像（img/title.jpg「AIサイボーグ中村の電線自動査定」）× ピンクネオン × AIサイボーグ中村。構成: ヒーロー → タブ（写真で査定/重さで査定） → ステップ → パネル → 白い査定結果カード（左: 写真+種類/重量/単価、右: ピンク「推定買取価格」にリール） → 特徴4項目（かんたんスピード査定 ほか） → 査定の流れ4ステップ + LINEボタン（config.lineUrl、空なら非表示）。**ジャグラー筐体・ハッピーランプは廃止**し、当たり演出は「ネオンサイン『いい電線だ！ハッピー価格で』が光る + サムズアップ中村が出現」。PC(≥900px)は右サイドに中村を一人（img/nakamura-cables.jpg）常時表示し、当たり時に thumbsup へ入れ替わりネオン点灯。モバイルはヒーロー横に中村一人、当たり時は結果カード下にネオン+中村が出現
- パーツ画像はすべて背景付き（透過なし）なので `mask-image` で縁をぼかして暗背景に馴染ませている。旧キャラ画像（nakamura-point/cheer）は削除、`happy-logo.png`/`logo.png` は未使用だが残置
- 設定は `assess/config.js` に集約。`classifyEndpoint` 未設定時は `classifyLocal`（銅断面ブロブ抽出→単心/多心判定→被覆厚比で8割/6割）にフォールバック。`test-fixtures/` の7枚で回帰確認できる
- 当たり確率 `happyChance`(既定0.33)、点灯はリール回転開始の瞬間、`?happy=1|0` で強制。点灯有無で金額は変わらない旨を画面に明記。効果音は独自合成（ペカ告知音・大当たりファンファーレ）
- 寸法・操作基準は**デジタル庁デザインシステム（DADS v2.0.1）**を継続: 本文16px/最小14px・行間1.7・8pxグリッド・角丸8/12/16・ボタン48/56px・タップ44px・フォーカス黄#FFD43D（暗背景では背景色2px+黄6pxの二重リング）・白カード文字#1A1A1A/#767676。色は世界観に合わせ 黄#FFD400（主CTA）/ シアン#4FC3FF（ドロップ枠・リンク）/ ピンク#FF2D95（価格・ネオン）

## Worker（worker/）

- `POST /api/classify`: `@anthropic-ai/sdk` の `client.beta.messages.create`、`claude-opus-5`、structured outputs(json_schema)、`fallbacks: "default"`
- `GET /api/prices`: colors.main.jp をスクレイプして単価抽出。`parsePrices` の正規表現は保存済みHTMLで動作確認済み
- 型チェック: `cd worker && npm install && npm run typecheck`。デプロイは README 参照（未デプロイ・APIキー未設定）

## ローカル確認

`.claude/launch.json` の `happy-densen`（python http.server, port 8765）。ブラウザでファイル選択ができない環境では
JSで canvas→File を `[data-el=file]` に流し込んで `change` を発火させるとテストできる。
