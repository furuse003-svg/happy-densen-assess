# fn_ハッピーデンセン銅線買取 — AI自動査定ウィジェット

ハッピーデンセン（北海道プリオン株式会社 / パワフルトレードセンター系）の被覆銅線買取LP
https://lp.used-cable.net/ に設置する査定ウィジェット。フレームワーク無しの静的HTML/CSS/JS + Cloudflare Worker。

## 仕様の要点

- 流れ: 写真アップ → AI判別（8割銅線 / 6割銅線 / Fケーブル） → 重量手入力 → 「単価×重量」をリール演出で表示。タブ「重さで査定」は写真なしで種類を手選択→重量へ
- 単価の出典は https://colors.main.jp/ の「被覆銅線買取価格」（2026-09-03時点: 8割1,660 / 6割1,400 / F 860 円/kg税込）。**出典は画面に表示しない**（2026-09-05指示）
- **埋め込み型・レスポンシブ**: `<div id="happy-assess"></div><script src="/assess/embed.js" defer>` を貼るだけ。最大幅1120px、900px以上で2カラム（右にサイド）。`assess/embed.js` がHTMLテンプレート+ロジック、`assess/style.css` は `.hd-assess` 配下に `hda-` 接頭辞でスコープ。`demo.html` がレスポンシブ模擬サイト、`widget.html` が単体、`index.html` は `build_share.py` が生成する公開デモ
- **デザイン（2026-09-18 再現版・`redesign` ブランチのみ／未公開）**: ユーザー作成の3枚のアートボードを**固定幅1120pxでそのまま再現**（レスポンシブは後回し、JSで枠幅に合わせて全体を縮小）。参考: `画像/査定前/AI中村画面 (1).jpg`（査定前）、`画像/通常バージョン.png`（査定後・通常）、`画像/最強バージョン/最強バージョンイメージ.png`（査定後・大当たり）。パーツ: `画像/査定前/nakamura_parts/`、`画像/最強バージョン/cyborg_parts/`（数字画像 digits/ 含む）。**パーツは全部黒背景の不透明画像**なので黒を抜いて透過PNG化（`assess/img/cyber-*.png`, `cyborg.png`, `digits/*.png`。しきい値キー: 暗い面は不透明のまま、グロー系はソフトキー）。中村の写真2枚（倉庫背景付き）は `mask-image` で縁をぼかして配置
- 4画面構成（`data-screen`）: `upload`（査定前: タイトル画像・タブ3つ・D&Dパネル・こんな写真でOK・中村＋吹き出し＋チェックリスト・ネオン＋サムズアップ中村・査定結果の一例・特徴4項目・査定の流れ＋LINE） → `analyze`（AI解析完了: 白パネルに判定結果＋種類選択＋**重量入力**＋「査定結果を見る」。ステップ表示は参考どおり3段「写真をアップロード→AI解析→査定結果」で、重量はAI解析の中に含めた） → `result`（通常: 白カード「AI解析完了」写真＋ピンク「参考査定金額」リール、「査定内容」表、LINEで正式査定を依頼する、別の写真で査定する、特徴3項目、吹き出し「査定完了！いい電線だ！」） 。`jackpot`（最強: サイバー背景・サイボーグ中村・「いい値がついたぞ！」・「査定完了！」金文字・枠内に**金色の数字画像リール**・金エフェクト・キャッチコピー・LINE/もう一度査定する画像ボタン）は独立画面ではなく**カットイン**: 常に通常結果を表示し、当たり(`happyChance` 0.33 / `?happy=1|0`)のときだけ閃光＋斜めワイプ＋「JACKPOT!!」で通常結果の上に割り込む（`.is-cutin` で absolute 重ね表示）。「もう一度査定する」はカットインを閉じて通常結果に戻す（再抽選しない）。査定前画面のネオン「ハッピー」はサムズアップ中村より手前(z-index 5)
- 2026-09-18 追加指示: 「POWERFUL TRADE GROUP」・手書き画像・縦書き「現場がハッピー」は削除、RECYCLE…を右上へ。カメラ/写真選択ボタンは廃止し、ドロップ枠タップ→`<input type=file accept=image/*>`（capture無し）でOS標準の「写真を撮る/ライブラリ」を出す。査定前は右カラム（吹き出し→チェックリスト→査定結果の一例）をドロップ枠の高さに揃え、人物は右端に小さく（幅250）
- 2026-09-18 追加指示: **キャンバス幅を840pxに縮めて縦長寄り**（スマホ想定）、中村は1.5倍（幅375）で文字に被せてよい（`.hda-chara--main` z-index 1）。最強版は1120pxアートボードを `.hda-jackpot-inner` で0.75倍に縮めて収める（高さ1052、カットイン時は結果画面の高さまで暗く塗る）。style.css 末尾の「縦長レイアウト」ブロックが上部の1120px定義を上書きしている
- **タブは廃止・写真で査定のみ**（2026-09-18指示: 情報を減らす）。判定は公開デモと同じ「断面から判定」の案内（例写真は test-fixtures の断面3枚 `ex-hachi/roku/f.jpg`）。人物は `画像/全身1.png`(立ち姿)・`全身2.png`(サムズアップ) のグリーンバックをクロマキーで透過した `nakamura-full1/2.png`（マスク不要）
- **電線以外のリアクション（2026-09-21）**: AI解析画面で判定が `unknown` かつ被写体が電線でないとき、人物とネオンキャッチを差し替える。①電線以外(`subject: "other"`) → 頭を抱える中村 `nakamura-shock.png` ＋ 「それは違う！」`neon-wrong.png`、②ハゲ頭(`subject: "bald_head"`) → 自分を指差す中村 `nakamura-self.png` ＋ 「それは中村だ！」`neon-nakamura.png`。素材は `画像/裏画像/` のグリーンバック／紺背景を `tools/make_reaction_assets.py` で透過PNG化（ネオンは枠の外だけ透過、`neon-happy.png` も同様に透過化して結果画面の radial mask を廃止）。Worker は structured output に `subject` を追加、ローカル判定は「肌色の最大ブロブが大きく丸く詰まっている」(`isHeadBlob`) で頭を検出し、断面が無く暗部・灰色も少なければ other 扱い
- 設定は `assess/config.js` に集約。`classifyEndpoint` 未設定時は `classifyLocal`（銅断面ブロブ抽出→単心/多心判定→被覆厚比で8割/6割）にフォールバック。`test-fixtures/` の7枚で回帰確認できる
- 効果音は独自合成で**ダークSF／サイボーグ風の緊張感**（2026-09-18指示: ターミネーター的な雰囲気。ただし既存曲のメロディ・リズムは使わない）: 回転中は低いドローン＋サーボ音、停止で金属打撃、カットインはライザー→衝撃→金属一撃＋警告ブザー、大当たりは短調のシンセ刻み＋金属連打＋最後に衝撃。初期OFF。共有用ビルド `build_share.py` は `window.HAPPY_ASSETS`（digits/ 含む全画像の data URI）を注入し、JS は `asset(name)` で解決
- 寸法・操作基準は**デジタル庁デザインシステム（DADS v2.0.1）**を継続: 本文16px/最小14px・行間1.7・8pxグリッド・角丸8/12/16・ボタン48/56px・タップ44px・フォーカス黄#FFD43D（暗背景では背景色2px+黄6pxの二重リング）・白カード文字#1A1A1A/#767676。色は世界観に合わせ 黄#FFD400（主CTA）/ シアン#4FC3FF（ドロップ枠・リンク）/ ピンク#FF2D95（価格・ネオン）

## Worker（worker/）

- `POST /api/classify`: `@anthropic-ai/sdk` の `client.beta.messages.create`、`claude-opus-5`、structured outputs(json_schema)、`fallbacks: "default"`
- `GET /api/prices`: colors.main.jp をスクレイプして単価抽出。`parsePrices` の正規表現は保存済みHTMLで動作確認済み
- 型チェック: `cd worker && npm install && npm run typecheck`。デプロイは README 参照（未デプロイ・APIキー未設定）

## ローカル確認

`.claude/launch.json` の `happy-densen`（python http.server, port 8765）。ブラウザでファイル選択ができない環境では
JSで canvas→File を `[data-el=file]` に流し込んで `change` を発火させるとテストできる。
