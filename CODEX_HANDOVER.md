# LiveKitchen Codex引き継ぎ

最終更新: 2026-09-29（Asia/Tokyo）

この文書は、過去の会話を知らない新しいCodexセッションが、`AGENTS.md` とリポジトリを読んで安全に作業を継続するための基準資料です。事実、確定事項、検討中事項を混同しないでください。

## 1. 現在の状態（最初に読むこと）

- 公開中のTOP `https://livekitchen.tokyo/` は、2026/9/29に承認済みリファクタリング版へ切り替え済みです。
- 同じデザインのレビュー環境を `https://livekitchen.tokyo/preview/` に維持しています。
- 2026/9/29、ユーザーの明示的な指示によりver.1.0を発行し、公開 `/` を固定ページ `/v1-0/` として保存しました。
- 今後の通常変更では版番号を上げず、ユーザーの明示的な指示がある場合だけ次版を発行します。
- 固定納品版 `/v0-2/`、`/v0-3/`、`/v0-4/`、`/v1-0/` はその版の修正を明示依頼されない限り変更してはいけません。
- 通常の修正では版番号を上げません。詳細は `AGENTS.md` を優先してください。
- ユーザーの直近指示は「引き継ぎ文書を作ること」であり、この文書作成以外の新しいリファクタリング作業は開始しません。

## 2. リポジトリとGitの現在位置

### 公開側ワークツリー

- パス: `/srv/livekitchen_hp`
- ブランチ: `main`
- 公開サービスが実際に参照するディレクトリです。
- リファクタリング前の公開状態を保存した基準点:
  - commit `5932dbb chore: save current production state before refactor`
- `/preview/` 中継追加後のmain:
  - commit `82c1720 feat: add isolated refactor preview route`
- mainの `server.cjs` には `/preview/` をポート8236へ中継する処理だけが追加されています。
- 公開TOPのHTML/CSSは基準点の表示を維持しています。
- `CODEX_RESUME` という未追跡ファイルが存在する場合があります。Codexセッション再開用のローカルファイルで、サイト資産ではありません。コミットしないでください。

### リファクタリング側ワークツリー

- パス: `/srv/livekitchen_hp_refactor`
- ブランチ: `refactor/livekitchen`
- 実装コミット:
  - commit `4961a79 refactor: rebuild LiveKitchen site and add public pricing page`
- このブランチが `/preview/` で表示されるリファクタリング候補です。
- 現在のプレビュー確認が終わるまではmainへmergeしないでください。

### 納品タグ

- 現在の正式な最新版タグ: `v1.0`
- 過去タグ: `v0.2`
- 旧版保管タグ: `archive/v0.3`, `archive/v0.4`
- その他の退避タグは `git tag --list` で確認してください。
- バージョン運用は必ず `AGENTS.md` に従います。

## 3. システム構成

### アプリケーション

- Node.js標準ライブラリを中心とした構成です。
- npmビルド、React、Vue等のフレームワークはありません。
- 主な公開側ファイル:
  - `index.html`: TOPページテンプレート
  - `style.css`: サイトCSS
  - `script.js`: MENU、ギャラリー、問い合わせ、Cookie保存
  - `server.cjs`: HTTP配信、テンプレート描画、各URLのルーティング
  - `site.config.cjs`: 電話、メール、SNS、FAQ等の公開設定
  - `contact.cjs`: 問い合わせAPI、検証、CSRF、Origin制限
  - `inquiry-store.cjs`: 問い合わせ保存と受付番号
  - `system-sync.cjs`: `/cm/`案件管理システムとの連携
  - `uploads.cjs`: 提案資料アップロード
  - `delivery-history.cjs` / `delivery-history.json`: 納品履歴
  - `snapshots/`: 固定納品版
- リファクタリングブランチでは次を追加済みです:
  - `pricing.html`: 一般顧客向け料金ページ
  - `pricing-data.cjs`: TOPと料金ページの共通料金データ

### systemd

公開サービス:

- unit: `italian-school.service`
- 実行: `/usr/bin/node /srv/livekitchen_hp/server.cjs`
- 基本ポート: `8234`
- 公開問い合わせ保存先: `/var/lib/italian-school/`

プレビューサービス:

- unit: `livekitchen-preview.service`
- 実行: `/usr/bin/node /srv/livekitchen_hp_refactor/server.cjs`
- 待受: `127.0.0.1:8236`
- `SITE_BASE=/preview`
- プレビュー問い合わせ保存先: `/var/lib/livekitchen-preview/`
- 公開問い合わせとプレビュー問い合わせは分離されています。

状態確認:

```sh
systemctl status italian-school.service --no-pager
systemctl status livekitchen-preview.service --no-pager
```

設定変更後だけ必要に応じて再起動します。公開指示なしに公開内容を切り替えないでください。

### Cloudflare / ホスト

- `livekitchen.tokyo` は現在OMVサーバーを向いています。
- `kitchen.okayu-llc.jp` も同じOMVを向く互換ドメインです。
- 正式な本番ドメインは `https://livekitchen.tokyo/` です。
- 将来、本番はAWSへ移行する予定です。
- レビュー環境はOMVの `https://livekitchen.tokyo/preview/` を使います。
- AWS移行はまだ実施しません。

## 4. 公開構成と重要URL

| URL | 用途 | 状態・注意 |
|---|---|---|
| `https://livekitchen.tokyo/` | 公開TOP | ver.1.0 |
| `https://livekitchen.tokyo/preview/` | リファクタリングTOP | noindex。確認用 |
| `https://livekitchen.tokyo/preview/pricing/` | 一般向け料金ページのレビュー環境 | noindex。確認用 |
| `https://livekitchen.tokyo/pricing/` | 一般向け料金ページ | 公開中 |
| `https://livekitchen.tokyo/pricing-owner-meeting/` | オーナーシェフとの料金整理資料 | 削除・一般公開ページ化しない。noindex |
| `https://livekitchen.tokyo/list/` | 合同会社おかゆから顧客への通信・納品履歴 | 維持 |
| `https://livekitchen.tokyo/proposals/` | 提案・アップロード関連 | 維持 |
| `https://livekitchen.tokyo/v0-2/` | ver.0.2固定版 | 変更禁止 |
| `https://livekitchen.tokyo/v0-3/` | ver.0.3固定版 | 変更禁止 |
| `https://livekitchen.tokyo/v0-4/` | ver.0.4固定版 | 変更禁止 |
| `https://livekitchen.tokyo/v1-0/` | ver.1.0固定版 | 変更禁止 |
| `https://livekitchen.tokyo/cm/` | マルチテナント案件管理システム | 既存連携を壊さない |

`/preview/` はHTMLのrobots指定とHTTP `X-Robots-Tag: noindex, nofollow` の両方を設定済みです。

## 5. デザイン・ブランド方針

### 維持するブランド資産

- 深いダークグリーン
- アイボリー
- 少量のゴールド
- クラシックな明朝系Typography
- LiveKitchenロゴ
- 料理写真
- MASASHIの人物写真
- 主要コピー
- 既存文章、料理情報、経歴、実績、固有名詞

ロゴ画像自体を勝手に変更しないでください。ブランド表記は原則 `LiveKitchen` に統一します。

### 重要なブランドコピー

以下は残します。

- 「美食で彩る、特別なひとときを。」
- 「その日、その場所、その人のために。」

### 目指す方向

- 新しいブランドへ作り替えるのではなく、既存ブランドを整理する。
- 「豪華にする」より「静かにする」。
- 余白を増やす。
- 写真を主役にする。
- Typographyを活かす。
- MASASHIと料理を主役にする。
- 高級ホテルの企業サイトではなく、「一人の料理人MASASHIへその日の料理を依頼するPrivate Chefブランド」として見せる。
- 高級感を枠・金色・装飾の量で表現しない。

### UI原則

1. 枠を減らす
2. 不要な罫線を減らす
3. 金色はアクセントに限定
4. アイボリーを本文の基本色にする
5. セクション間の余白を増やす
6. 写真を大きく見せる
7. 本文の一行を長くしすぎない
8. CTAに優先順位を付ける
9. スマートフォンファースト
10. 装飾より料理写真・コピー・人物を主役にする

## 6. リファクタリング版のTOP構成

`refactor/livekitchen` では次の順に実装済みです。

1. HERO
2. 利用シーン
3. Selected Dishes
4. 料金の目安
5. LiveKitchenの特徴
6. 食材へのこだわり
7. 料理への想い
8. CHEF MASASHI
9. Gallery
10. FAQ
11. 問い合わせ

### Selected DishesとGalleryの役割

- Selected Dishes: ページ前半でサービスを理解してもらう厳選写真。3枚を大きく表示。
- Gallery: もっと料理を見たい人向けの作品集。既存10枚と拡大・前後移動・スワイプを維持。

### CTA

- HEROの主CTAは「無料相談・お見積り」1つ。
- 電話、Instagram、Xは小さな補助導線。
- スマホ下部固定CTAは「無料相談・お見積り」と電話アイコン。
- `tel:` リンクを維持。
- ページ内リンクに `↗` を使わない。内部リンクは `→`。
- `↗` はInstagram等の外部リンクだけに使用可能。

### CHEF MASASHI

- MASASHIを会社説明より重要なブランド要素として扱う。
- 写真、余白、Typographyで自然に信頼感を出す。
- 広告的・誇張的な演出を避ける。
- 次の既存事実を勝手に変更しない:
  - 調理業界20年以上
  - 年間100件を超えるプライベートシェフ＆ケータリングプロジェクト
  - リピート率80%以上
  - Netflix日本法人向けケータリング（プロヴェナンスディストリービションズ経由）
  - Meta関連案件（同経由）
  - すみだ水族館向けケータリング

## 7. 料金体系

料金は単純な固定価格ではなく、概念的に次の組み合わせです。

```text
場所 × 料理のグレード × メニュー × 人数 ＋ オプション
```

ただし、未確定条件を計算式や公開料金として補完してはいけません。

### 公開用として採用している基本価格帯

- Regular: 13,000円 / person
- Premium: 20,000円 / person
- Luxury: 25,000円〜 / person

TOPでは価格感、短い特徴、代表料理2〜3点だけを見せます。詳細は `/pricing/` へ誘導します。

### `pricing-data.cjs`

リファクタリング版では料金を `pricing-data.cjs` に集約しています。

- `plans`: 3プラン
- `options`: 公開中の4オプション
- `factors`: 料金が変わる要素
- 数値は将来の概算計算を想定して `price.from`, `price.to`, `unit`, `currency` を保持
- 表示用文字列も `priceLabel` として保持
- 現時点では料金シミュレーターを実装しない

### 公開中・公開案にあるオプション

- ワインペアリング: ＋5,000円 / 人
- 朝食作り置き: ＋3,500円 / 人
- お子様ディナー: 5,500円 / 人
- 愛犬用ディナー: 3,500円 / 皿〜

### 一般向け `/pricing/`

リファクタリング版では以下を実装済みです。

- 3つの基本価格帯
- 各プランの違いと代表料理
- 料金が変わる要素
- オプション
- 利用シーン
- Private ChefとCateringの違い
- 開催場所・会場条件の考え方
- 最終的な個別見積の説明
- 既存問い合わせフォームへのCTA

巨大な料金表や料金シミュレーターは実装していません。

### `/pricing-owner-meeting/`

- 内部の料金整理・打ち合わせ資料です。
- 一般顧客向けページへ転用しません。
- 削除しません。
- noindexですが、URLを知っていれば閲覧できます。
- 本当に社外秘にする場合は、URL変更ではなくCloudflare Access等の認証を別途検討します。

## 8. 未確定事項（公開料金として書かない）

以下は未確定です。推測や提案値を確定情報として公開してはいけません。

- 最低利用金額
- 出張費
- 地域ゾーン
- 8,000円商品の扱い
- 箱根16,000円 / 人案件の正式な位置付け
- ケータリング専用料金
- ケータリング一式105,000円実績を一般向け料金例として出すか
- 具体的な見積例
- キャンセル条件の具体値
- Luxuryの上限を一般向けに30,000円と固定表示するか

`pricing-owner-meeting` 内の「例」「推奨」「仮説」「要決定」は未確定です。

## 9. 問い合わせシステム

### ブラウザ側

問い合わせフォームは原則維持しています。

主な項目:

- 個人 / 法人
- 氏名
- 会社名
- メール
- 電話
- 電話連絡可能時間
- 希望日
- 開催希望時間
- 開催場所
- 予定人数
- 予算
- 希望サービス
- アレルギー・食事制限
- 相談内容
- 希望連絡方法
- 個人情報同意

Cookieに一部入力を保存し、次回復元します。保存内容を削除する操作もあります。

### サーバー側

- エンドポイント: `/api/contact-token`, `/api/inquiries`
- CSRF: 署名付きトークン＋HttpOnly/SameSite Cookie
- Origin制限あり
- honeypotあり
- 送信回数制限あり
- 32KB制限
- サーバー側の型・文字数・日付検証
- 再送時の重複防止
- 問い合わせ本文は公開ディレクトリ外へ保存
- 公開問い合わせ保存先: `/var/lib/italian-school/inquiries/`
- プレビュー問い合わせ保存先: `/var/lib/livekitchen-preview/inquiries/`
- 個人情報をアプリログへ出さない

### メール・案件管理

- フォーム内容は `/cm/` のマルチテナント案件管理システムへ連携する構成です。
- ホームページ側のメール送信は旧互換用で、現在は中央の案件管理側へ一本化されています。
- SMTP設定やAPIキーは環境ファイルにあり、Gitへ保存しません。
- 認証情報、アップロードキー、問い合わせデータを画面やコミットへ出さないでください。

### 料金ページからの引き継ぎ

- 現在の `/pricing/` CTAは既存フォームへ移動するだけです。
- `plan` やオプションの自動引き継ぎは未実装です。
- 将来実装する場合は、URL値を許可リストで検証し、フォーム、`contact.cjs`、案件管理連携を同時に整合させます。
- 今回は無理に追加しません。

## 10. SEO・アクセシビリティ

リファクタリング版で実装済み:

- canonicalを `https://livekitchen.tokyo/` に修正
- `/pricing/` canonical追加
- `og:url` を正式ドメインへ修正
- `og:image` を正式ドメインへ修正
- `LiveKitchen` 表記へ統一
- `robots.txt` 配信
- `sitemap.xml` 配信
- H1/H2/H3構造整理
- alt、width、height、lazy loading確認
- skip link
- `:focus-visible`
- MENUのaria属性
- ギャラリーダイアログのキーボード、Esc、左右キー、フォーカス復帰
- フォームのlabel、legend、aria-live

SEO修正はver.0.4で公開済みです。

## 11. CSS / JavaScriptの整理結果

リファクタリング版の `style.css`:

- 旧: 約46KB
- 新: 約27KB
- `:root`: 1か所
- `!important`: 0件
- スマホ主要ルール: 1ブロック
- 色、余白、フォント、本文幅、罫線をCSS Variablesへ集約
- 既存の後追いoverride、旧ライトテーマ、重複selectorを整理

JavaScript:

- MENU、ギャラリー、問い合わせを関数単位へ整理
- サーバー側とクライアント側に重複していたSNS HTMLを解消
- 各ページで対象DOMがない場合も安全に終了
- 問い合わせデータ構造は変更していない

新たなフレームワークやビルド依存は追加していません。

## 12. テストと確認済み内容

リファクタリングブランチで実行済み:

```sh
node --test tests/*.test.cjs
```

- 11件成功
- 失敗0件

実ブラウザ確認済み:

- 360px
- 390px
- 768px
- 1440px

確認結果:

- TOPと料金ページに横スクロールなし
- 画像読み込み失敗なし
- アプリJavaScriptエラーなし
- MENUが画面内に収まる
- フォーム入力欄は最低約52px
- スマホHERO写真は約430〜460px高
- スマホ固定CTAは約61px高
- 本文下余白を確保し、固定CTAによる過剰な隠れを防止

プレビュー問い合わせも実ブラウザで、トークン取得から受付番号表示まで確認済みです。テスト問い合わせとテスト受付番号は削除済みです。

## 13. Git・納品バージョン運用

`AGENTS.md` の指示が最優先です。

- 通常変更では版番号を上げません。
- ユーザーが「小バージョン上げて」と明示した時だけ、小バージョンを上げます。
- ユーザーが「大バージョン上げて」と明示した時だけ、X.0へ上げます。
- 現在の最新版はver.1.0。次の小バージョンはユーザーの明示指示後にver.1.1です。
- 納品時は前回納品以降の実際の変更だけを履歴へ記録します。
- 相談・提案だけの内容を「実装済み」と記録しません。
- 固定版は、その版の修正をユーザーが明示した場合だけ変更します。
- 認証情報、問い合わせ、環境ファイルをGitへ入れません。

リファクタリング版はmainへ統合済みです。次の公開変更も、プレビュー確認とユーザーの公開指示を経てmainへ反映してください。

## 14. 絶対に壊してはいけないもの

- 現在の公開TOP `/`
- `/v0-2/`
- `/v0-3/`
- `/v0-4/`
- `/list/`
- `/proposals/`
- `/pricing-owner-meeting/`
- `/cm/` 案件管理連携
- 問い合わせフォーム
- CSRF、Origin制限、保存、重複防止
- 公開問い合わせデータ
- 電話 `tel:` リンク
- Instagramリンク
- Xリンク
- Cookie入力保存と削除操作
- 既存画像
- LiveKitchenロゴ
- MASASHI写真
- 既存の文章、料理名、価格、実績、固有名詞
- レスポンシブ表示
- 納品履歴とGitタグ

## 15. コンテンツ編集の原則

- 長いという理由だけで文章を削除しません。
- 事実に関係する内容を勝手に変更しません。
- 短く見せる必要がある場合は、配置変更、見出し化、折りたたみ、統合、詳細ページへの移動を優先します。
- 情報量を減らすことではなく、情報を自然に伝わる順序へ整理することが目的です。
- 新しい料理、受賞歴、顧客名、数字、対応地域、価格条件を創作しません。

## 16. 今後の作業

現時点の次の工程はユーザーによるプレビュー確認です。

1. ユーザーが `/preview/` と `/preview/pricing/` を確認
2. 修正指示があれば `refactor/livekitchen` で対応
3. 毎回、公開 `/` が従来版のままか確認
4. 360 / 390 / 768 / 1440pxを再確認
5. 問い合わせの回帰テスト
6. 次の変更も、ユーザーが「本番デプロイして」等と明示した場合だけ公開反映
7. 公開後に `/`, `/pricing/`, robots, sitemap,問い合わせを確認
8. バージョン番号は別途明示指示がない限り上げない

将来候補:

- 料金確定後、最低利用金額・出張費・地域条件を追加
- 確認済みの具体的な見積例を追加
- 料金選択から問い合わせへの安全な引き継ぎ
- 料金シミュレーター
- AWS本番移行
- `pricing-owner-meeting` に認証が必要ならCloudflare Access等を検討

## 17. 公開デプロイ時の注意

ユーザーが公開を明示するまで実行しません。

公開時には少なくとも以下を行います。

- mainとrefactorの差分レビュー
- 現在の公開基準点が残っていることを確認
- 固定版ディレクトリが変更されていないことを確認
- `node --test tests/*.test.cjs`
- `git diff --check`
- `/pricing/`, `/robots.txt`, `/sitemap.xml` のルート公開確認
- canonical / OG確認
- 問い合わせの独立テスト
- 公開問い合わせデータにテストデータを残さない
- ver.0.4公開直前のロールバックタグは `pre-release/v0.4`。正式納品タグは `v0.4` と `v1.0`

## 18. 重要な注意事項

- `/preview/` の中継はmain側の `server.cjs` にあるため、main側サーバーを古いcommitへ単純に戻すとプレビューが消えます。
- プレビューサービスを停止すると `/preview/` は502になります。
- `pricing-data.cjs` へ未確定料金を書かないでください。
- `site.config.cjs` には旧料金互換データが残っています。現在のリファクタリング料金表示は `pricing-data.cjs` が正です。
- 公開側とプレビュー側の問い合わせ保存先を混同しないでください。
- テストで公開問い合わせを送らないでください。プレビューまたは一時サーバーを使います。
- Cloudflareが挿入するInsightsスクリプトは現在のCSPによりブラウザコンソールで拒否される場合があります。サイト本体のJavaScriptエラーとは区別してください。
- 変更前に必ず `git status`, `git branch --show-current`, `git worktree list` を確認してください。
