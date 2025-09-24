# 登壇者情報自動処理システム (GAS)

Google Form で収集した登壇者情報を自動処理し、Google Chat での承認フローを経て n8n に通知するワークフローシステムの Google Apps Script 部分です。

## 概要

このシステムは以下の処理を自動化します：

1. **Google Form 回答受信**: 登壇者情報の自動取得
2. **画像処理**: Google Drive から画像を取得し、GCS にアップロード
3. **文書生成**: イベントページ掲載文の自動生成
4. **承認フロー**: Google Chat での承認/却下処理
5. **外部連携**: n8n Webhook への通知（IAP 認証付き）

## 機能

### 主要機能

- Google Form トリガー処理
- 画像の自動アップロード（GCS）
- イベントページ掲載文の自動生成
- Google Chat での承認フロー
- スプレッドシート自動更新
- n8n Webhook 連携（IAP 認証対応）

### 技術仕様

- **言語**: TypeScript
- **ビルド**: esbuild
- **認証**: Service Account (JWT), IAP 認証（JWT 直接送信方式）
- **API**: Google Chat API, Google Drive API, Google Cloud Storage API
- **デプロイ**: Google Apps Script
- **認証管理**: 共通認証サービス (`authService.ts`)

## セットアップ手順

### 1. 前提条件

- Google Cloud Platform プロジェクト
- Google Apps Script プロジェクト
- Google Chat スペース
- n8n インスタンス（Cloud Run + IAP 認証）

### 2. 依存関係インストール

```bash
cd gas
npm install
```

### 3. Google Cloud 設定

#### Service Account 作成

1. Google Cloud Console で Service Account を作成
2. 以下のロールを付与：
   - `Chat Bot`
   - `Storage Object Admin`
   - `Storage Object Viewer`
3. 秘密鍵を JSON 形式でダウンロード

#### GCS バケット作成

```bash
# バケット作成
gsutil mb gs://your-bucket-name

# 公開アクセス設定
gsutil iam ch allUsers:objectViewer gs://your-bucket-name
```

### 4. Google Apps Script 設定

#### 重要: スプレッドシートに紐づいたスクリプトの作成

**このシステムは、Google Form の回答が送信されるスプレッドシートに直接紐づいた Google Apps Script プロジェクトである必要があります。**

1. Google Form の回答先スプレッドシートを開く
2. スプレッドシートのメニューから「拡張機能」→「Apps Script」を選択
3. 新しいスクリプトプロジェクトが作成される
4. 作成されたスクリプトの ID をコピー（URL の `d/` と `/edit` の間の文字列）

#### .clasp.json の設定

1. `.clasp.json.sample` を `.clasp.json` にコピー：

   ```bash
   cp .clasp.json.sample .clasp.json
   ```

2. `.clasp.json` を編集してスクリプト ID を設定：

   ```json
   {
     "scriptId": "your-actual-script-id-here",
     "rootDir": "./dist",
     "scriptExtensions": [".js", ".gs"],
     "htmlExtensions": [".html"],
     "jsonExtensions": [".json"],
     "filePushOrder": [],
     "skipSubdirectories": false
   }
   ```

#### プロパティ設定

`setupProperties.ts` を実行してスクリプトプロパティを設定：

```typescript
// 必要なプロパティ
const template = {
  GCS_BUCKET_NAME: "your-bucket-name",
  GCS_PROJECT_ID: "your-project-id",
  GOOGLE_CHAT_SPACE_ID: "spaces/your-space-id",
  SA_CLIENT_EMAIL: "bot@your-project.iam.gserviceaccount.com",
  SA_PRIVATE_KEY:
    "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  SPREADSHEET_ID: "your-spreadsheet-id",
  SHEET_NAME: "フォームの回答",
  N8N_WEBHOOK_URL:
    "https://your-n8n-service-url.run.app/webhook/speaker-approval",
  CLOUD_RUN_SERVICE_URL: "https://your-n8n-service-url.run.app",
  EVENT_NAME: "DevFest 2025 Kansai",
  EVENT_DATE: "2025/12/14(土) 13:00-17:00",
  EVENT_URL: "https://gdg-kansai.connpass.com/event/example",
  EVENT_HASHTAG: "DevFest2025Kansai",
};
```

#### トリガー設定

1. Google Apps Script エディタで `onFormSubmit` 関数を選択
2. トリガーを作成：
   - **イベントソース**: スプレッドシートから
   - **イベントタイプ**: フォーム送信時

### 5. Google Chat App 設定

#### Chat App 作成

1. Google Chat で Chat App を作成
2. **接続先**: Apps Script を選択
3. **スクリプト ID**: 上記で作成した Apps Script のスクリプト ID を入力
4. **権限**: 以下のスコープを有効化：
   - `https://www.googleapis.com/auth/chat.bot`
   - `https://www.googleapis.com/auth/chat.messages`

#### スペースに追加

1. Chat App を対象スペースに追加
2. スペース ID を取得（`spaces/` で始まる形式）

### 6. n8n Webhook 認証設定

#### 認証方式

GAS から n8n の Webhook を呼び出す際は、**IAP（Identity-Aware Proxy）認証**を使用します。

- Cloud Run で IAP が有効になっている必要があります
- Service Account に IAP アクセス権限を付与します
- JWT を直接送信する方式で認証を行います

#### サービスアカウントの設定

n8n Webhook 認証には、ChatApp 認証と同じサービスアカウント（SA_CLIENT_EMAIL、SA_PRIVATE_KEY）を使用します：

```typescript
// スクリプトプロパティに設定
SA_CLIENT_EMAIL: "your-service-account@project.iam.gserviceaccount.com",
SA_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
```

#### 権限設定

既存の ChatApp 認証用サービスアカウントに IAP アクセス権限を付与します：

```bash
# サービスアカウントにIAPアクセス権限を付与
gcloud projects add-iam-policy-binding your-project-id \
  --member="serviceAccount:your-service-account@your-project.iam.gserviceaccount.com" \
  --role="roles/iap.httpsResourceAccessor"
```

#### 認証の動作

システムは以下の順序で認証を行います：

1. `N8N_WEBHOOK_URL` が設定されている場合 → IAP 認証を使用
2. URL が設定されていない場合 → Webhook 呼び出しをスキップ

### 7. ビルド・デプロイ

```bash
# ビルド
npm run build

# Google Apps Script にデプロイ
clasp push
```

**注意**: デプロイ前に `.clasp.json` で正しいスクリプト ID が設定されていることを確認してください。

### 7. テスト

#### 手動テスト

```typescript
// Google Apps Script エディタで実行
manualTestWorkflow();
```

#### フォームテスト

1. Google Form に回答を送信
2. Google Chat に承認カードが表示されることを確認
3. 承認/却下ボタンをクリックして動作確認

## 設定ファイル

### config.template.json

```json
{
  "EVENT_NAME": "DevFest 2030 in Kwansai",
  "EVENT_DATE": "2030/10/18(土) 10:00-18:00",
  "EVENT_URL": "https://gdgkwansai.connpass.com/event/366115/",
  "EVENT_HASHTAG": "DevFest2030Kwansai",
  "GCS_BUCKET_NAME": "announce-workflow-speaker-images-local",
  "GCS_PROJECT_ID": "gdg-event-workflow-project-id",
  "SPREADSHEET_ID": "your-spreadsheet-id",
  "SHEET_NAME": "フォームの回答",
  "GOOGLE_CHAT_SPACE_ID": "spaces/your-space-id",
  "N8N_WEBHOOK_URL": "https://your-n8n-service-url.run.app/webhook/speaker-approval",
  "CLOUD_RUN_SERVICE_URL": "https://your-n8n-service-url.run.app",
  "SA_CLIENT_EMAIL": "example@project.iam.gserviceaccount.com",
  "SA_PRIVATE_KEY": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",
  "ENABLE_DEBUG_LOG": true,
  "ALLOWED_IMAGE_TYPES": ["image/jpeg", "image/png", "image/gif"],
  "MAX_IMAGE_SIZE_MB": 10
}
```

## トラブルシューティング

### よくある問題

#### 1. 画像アップロードエラー

```text
Error: Invalid private key format
```

**解決方法**: Service Account の秘密鍵が正しく設定されているか確認

#### 2. Chat API エラー

```text
Error: Invalid add-on response returned
```

**解決方法**: Chat App の設定とスクリプトプロパティを確認

#### 3. スプレッドシートアクセスエラー

```text
Error: フォームの回答シートが見つかりません
```

**解決方法**: シート名に「フォームの回答」が含まれているか確認

## 開発

### ローカル開発

```bash
# 開発用ビルド
npm run build

# ファイル監視（オプション）
npm run build -- --watch
```

### コード構造

```text
src/
├── main.ts              # メイン処理
├── chatHandler.ts       # Chat ハンドラ
├── config.ts            # 設定管理
├── imageProcessor.ts    # 画像処理
├── nortificationService.ts # 通知サービス
├── templateEngine.ts   # テンプレート処理
├── columnMapping.ts    # 列マッピング
├── sheetFinder.ts      # シート検索
├── setupProperties.ts  # プロパティ設定
├── authService.ts      # 認証サービス（IAP/JWT）
└── type.ts            # 型定義
```
