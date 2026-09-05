# ハッピーデンセン AI自動査定システム

北海道プリオン株式会社「ハッピーデンセン」の被覆銅線買取LP（https://lp.used-cable.net/）に置く、
**写真アップ → AI判別 → 重量入力 → スロット演出で買取概算表示** のウィジェットです。

## 構成

```
assess/embed.js         ★ 埋め込みスクリプト（ウィジェット本体。HTMLテンプレート + ロジック）
assess/style.css        スタイル（すべて .hd-assess 配下にスコープ、LPのCSSと干渉しない）
assess/config.js        ★ 単価・HAPPYランプ点灯確率・API URL・LINE/TEL の設定（運用者はここだけ触る）
assess/img/             LPから流用したキャラクター画像・「ハッピー」ロゴ（ランプ用）
demo.html               レスポンシブなダミーサイトにウィジェットを埋め込んだ確認用デモ
widget.html             ウィジェット単体ページ（iframe用 / 動作確認用）
index.html              公開デモ（build_share.py が生成。GitHub Pages のトップ）
test-fixtures/          判定ロジックの確認用写真（価格サイトの実物写真: 8割/6割/5割/Fケーブル）
build_share.py          共有用の単一HTML（dist/happy-assess-share.html）を生成するスクリプト
dist/                   生成物。Claudeアーティファクト等にそのまま置ける1ファイル版デモ
worker/                 Cloudflare Worker（Claude vision による画像判別API + 価格自動取得API）
```

## 動かし方（ローカル確認）

```bash
python3 -m http.server 8765
```

→ http://localhost:8765/demo.html （レスポンシブな埋め込みデモ）、http://localhost:8765/widget.html （単体）、http://localhost:8765/ （公開デモと同じページ）を開く。スマホ〜PCの幅で確認できる。
`config.js` の `classifyEndpoint` が空のときは、ブラウザ内の**簡易判定**（被覆の色・銅の見え方から推定）で動作します。
判定結果はユーザーがタップで修正できるので、API無しでも一連の流れは成立します。

## 共有用デモ（1ファイル版）

```bash
python3 build_share.py   # → dist/happy-assess-share.html と index.html
```

CSS・JS・画像・サンプル写真をすべて埋め込んだ単一HTMLです。ウィジェットの上に「サンプル写真で試す」ボタン（8割/6割/Fケーブル）が付きます。
公開URL（GitHub Pages・誰でも閲覧可）: https://furuse003-svg.github.io/happy-densen-assess/
- `demo.html` … サイト埋め込みの見え方、`widget.html` … ウィジェット単体、`assess/embed.js` … 埋め込み用スクリプト（試験的にこのURLを直接サイトから読み込むことも可能）
- リポジトリ: https://github.com/furuse003-svg/happy-densen-assess （main に push すると自動で反映）
- Claudeアーティファクト版（非公開リンク）: https://claude.ai/code/artifact/a419efca-6667-4cb5-a41d-98c20dd6ec06

ウィジェットを更新したら `python3 build_share.py` → `git add -A && git commit && git push` で公開URLが更新される。

## AI判定API（Cloudflare Worker）のデプロイ

```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put ANTHROPIC_API_KEY     # Anthropic Console で発行したキーを貼る
npx wrangler deploy
```

デプロイ後に表示される URL（`https://happy-densen-api.<account>.workers.dev`）を `assess/config.js` に設定:

```js
classifyEndpoint: "https://happy-densen-api.<account>.workers.dev/api/classify",
pricesEndpoint:   "https://happy-densen-api.<account>.workers.dev/api/prices",
```

- `POST /api/classify` … `{ image: base64, media_type }` → `{ category: hachi|roku|f|unknown, confidence, reason }`
  - モデルは `claude-opus-5`（`wrangler.toml` の `MODEL` で変更可）。structured outputs で必ずJSONが返る。
  - 安全分類器が拒否した場合は `fallbacks: "default"` で別モデルへ自動フォールバック。
- `GET /api/prices` … https://colors.main.jp/ の価格表から 8割/6割/Fケーブル の単価を抽出（6時間キャッシュ）。
  - 取得できないときはフロントが `config.js` の単価を使うので、サイト構造が変わっても止まらない。
- CORS は `wrangler.toml` の `ALLOWED_ORIGINS` で制御（本番はLPドメインのみ）。

ローカルでWorkerを動かすときは `cp .dev.vars.example .dev.vars` してキーを入れ、`npm run dev`（http://localhost:8787）。

## 単価の変更

1. `assess/config.js` の `prices` を書き換える（税込 円/kg）。`pricesUpdated` も更新。
2. Workerを使っていれば自動取得が優先されるので、通常は触らなくてよい。
3. 店頭スタッフ用に、URLパラメータで一時的に上書きも可能: `?p8=1700&p6=1450&pf=900`（LPのURL末尾に付ける）

## サイトへの設置（レスポンシブ）

`assess/` フォルダをそのまま公式サイトのサーバーにアップロード（例: `https://<公式サイト>/assess/`）し、
差し込みたい位置に **この2行** を貼るだけです。

```html
<div id="happy-assess"></div>
<script src="/assess/embed.js" defer></script>
```

- `embed.js` が同じフォルダの `style.css` / `config.js` / `img/` を自動で読み込みます（Google Fonts はサイトで読込済みなら再利用）。
- ウィジェットは親要素の幅いっぱい（最大720px・中央寄せ）で描画され、560px以上ではタブレット/PC向けにボタン・リール・入力欄が大きくなります。
- LINE・電話などの問い合わせ導線は含めていません（サイト側で配置する前提）。
- サイトに固定ヘッダーがある場合は `config.js` の `scrollOffset`（ステップ切替時のスクロール位置の上余白、既定80px）を高さに合わせてください。
- 複数箇所に置きたいときは `<div data-happy-assess></div>` を増やせば各々独立して動きます。
- iframe で隔離したい場合は `widget.html` を `<iframe src="/assess-page/index.html" style="width:100%;border:0;min-height:1100px">` で読み込んでも動きます。

## ハッピーランプ（ジャグラーのGOGOランプ風）

- 「査定スタート！」を押すたびに抽選し、`config.js` の `happyChance`（既定 0.33 = 約1/3）で点灯します。
- ランプの表示はサイトロゴの「ハッピー」（`assess/img/happy-logo.png`）。消灯時は暗く沈み、点灯時に発光します。
- 点灯タイミングはリールが回り始めた瞬間（レバーON）。点灯時は「ペカッ」告知音・閃光、停止後に大当たりファンファーレ・紙吹雪・メッセージ。効果音はすべてWebAudioで合成した独自音（既存機種の音源・メロディの複製ではない）。
- 筐体はジャグラー風: クローム縁のピンク筐体、黒いリールパネルと赤いペイライン、左下の黒枠ランプ（GOGOランプの位置）、赤LEDの WEIGHT / PRICE 表示、MAX BET・赤黄緑のストップボタン（リール停止に合わせて点灯）。再抽選は全幅の大きな「もう一度試す」ボタン（レバーの玉アイコン付き）。
- 点灯しなくても金額は同じで、「査定完了！」の控えめな演出になります（画面にも「演出で金額には影響しません」と明記）。
- 動作確認用に `?happy=1`（必ず点灯）/ `?happy=0`（点灯しない）で強制できます。
- 「もう一度試す」ボタンで再抽選できます。

## 簡易判定（API未接続時）のロジック

`classifyEndpoint` が空のときは `embed.js` の `classifyLocal` が動きます。

1. 画像を320px幅に縮小し、画素を「銅色 / 被覆っぽい暗色・灰色 / 有彩色」に分類。灰色が支配的なら **Fケーブル**。
2. 銅色の丸い塊（断面）を抽出。周囲1.25倍半径のリングが黒い被覆だけなら**単心**、他の芯線や介在物（茶色・緑など）が見えれば**多心 → 6割**。
3. 単心は24方向に被覆の厚みを測り、導体半径との比から銅の重量比を推定（比重 銅8.9 / 被覆1.4）。0.72以上なら **8割**、未満なら 6割。
4. 断面が写っていなければ「判別できませんでした」として手動選択に誘導。

`test-fixtures/` の7枚（8割単心CV・断面なし・6割多心CV・6割IV緑×2・5割緑多心・Fケーブル）はすべて期待どおりに判定されることを確認済み。
ただし色と形だけの推定なので、本番は Worker（Claude vision）の接続を推奨します。

## デザイン基盤（デジタル庁デザインシステム）

フォーム部分（STEP1〜3・ボタン・入力欄・補足文）は [デジタル庁デザインシステム](https://design.digital.go.jp/)（DADS v2.0.1、`@digital-go-jp/design-tokens` の値）に沿っています。

- 文字: 本文16px以上・最小14px、行間1.7（本文）/1.5（補足）、文字間.01〜.02em、Noto Sans JP
- 余白: 8pxグリッド、角丸 8/12/16px、影は elevation-1/2
- ボタン: Solid Fill（主要）/ Outline（次要）/ Text（下線）の3種、高さ Medium 48px・Large 56px、タップ領域44px以上、無効時はグレー #949494
- フォーカス: 黄 #FFD43D 2px ＋ 黒 4px のダブルリング（キーボード操作時）
- 色: 本文 #1A1A1A、補足 #767676、境界 #949494、リンク #0017C1、成功 #259D63。ブランドのピンクは文字に使うときはコントラスト4.5:1を満たす #D40F5E に置き換え
- スロット筐体はブランド演出のため例外（LEDのラベル等の装飾文字のみ14px未満）

## 判定区分

| key | 名称 | 見分け方 |
|---|---|---|
| hachi | 8割銅線 | 黒色被覆。断面で銅の割合が高い（導体が太く被覆が薄い） |
| roku | 6割銅線 | 黒色被覆。断面で銅の割合が中程度（被覆厚め・導体細め） |
| f | Fケーブル（VA線） | 灰色の平型ケーブル（VVF） |

## 注意

- 表示金額は「単価 × 重量」の概算。実際の買取は店頭計量・状態確認・当日相場で決まる旨を画面に明記済み。
- 効果音はデフォルトOFF（右上🔇ボタンでON、設定はブラウザに保存）。
