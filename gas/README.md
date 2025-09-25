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
- **Terraform で作成した ChatBot 用サービスアカウント**（`chatbot-sa`）

**重要**: この GAS システムは、Terraform で作成した ChatBot 用サービスアカウント（`chatbot-sa`）を使用します。先にメインの README.md の「Google Cloud Platform の設定」セクションに従って、ChatBot 用サービスアカウントと JSON キーファイル（`chatbot-sa-key.json`）を作成してください。

### 2. 依存関係インストール

```bash
cd gas
npm install
```

### 3. Google Apps Script 設定

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
// 必要なプロパティ（Terraformで作成したサービスアカウントを使用）
const template = {
  GCS_BUCKET_NAME: "your-bucket-name",
  GCS_PROJECT_ID: "your-project-id",
  GOOGLE_CHAT_SPACE_ID: "spaces/your-space-id",
  SA_CLIENT_EMAIL: "chatbot-sa@your-project.iam.gserviceaccount.com", // Terraformで作成
  SA_PRIVATE_KEY:
    "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n", // chatbot-sa-key.jsonから取得
  SPREADSHEET_ID: "your-spreadsheet-id",
  SHEET_NAME: "フォームの回答",
  N8N_WEBHOOK_URL:
    "https://your-n8n-service-url.run.app/webhook/speaker-approval",
  CLOUD_RUN_SERVICE_URL: "https://your-n8n-service-url.run.app",
  EVENT_NAME: "DevFest 2025 Kansai",
  EVENT_DATE: "2025/12/14(土) 13:00-17:00",
  EVENT_URL: "https://gdg-kansai.connpass.com/event/example",
  EVENT_HASHTAG: "DevFest2025Kansai",
  ENABLE_DEBUG_LOG: true,
};
```

**重要**: `SA_PRIVATE_KEY` の値は、Terraform で作成した `chatbot-sa-key.json` ファイルの `private_key` フィールドの値をコピーしてください。

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

n8n Webhook 認証には、Terraform で作成した ChatBot 用サービスアカウント（`chatbot-sa`）を使用します：

```typescript
// スクリプトプロパティに設定（Terraformで作成したサービスアカウント）
SA_CLIENT_EMAIL: "chatbot-sa@your-project.iam.gserviceaccount.com",
SA_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n", // chatbot-sa-key.jsonから取得
```

#### 権限設定

**注意**: ChatBot 用サービスアカウントの IAP アクセス権限は、Terraform の`iap_members`設定で自動的に付与されます。メインの README.md の「Terraform によるインフラストラクチャ構築」セクションで`iap_members`にサービスアカウントを追加してください。

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
  "GCS_BUCKET_NAME": "announce-workflow-speaker-images-prod",
  "GCS_PROJECT_ID": "your-project-id",
  "SPREADSHEET_ID": "your-spreadsheet-id",
  "SHEET_NAME": "フォームの回答",
  "GOOGLE_CHAT_SPACE_ID": "spaces/your-space-id",
  "N8N_WEBHOOK_URL": "https://your-n8n-service-url.run.app/webhook/speaker-approval",
  "CLOUD_RUN_SERVICE_URL": "https://your-n8n-service-url.run.app",
  "SA_CLIENT_EMAIL": "chatbot-sa@your-project.iam.gserviceaccount.com",
  "SA_PRIVATE_KEY": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",
  "ENABLE_DEBUG_LOG": true,
  "ALLOWED_IMAGE_TYPES": ["image/jpeg", "image/png", "image/gif"],
  "MAX_IMAGE_SIZE_MB": 10
}
```

**重要**:

- `SA_CLIENT_EMAIL`: Terraform で作成した ChatBot 用サービスアカウントのメールアドレス
- `SA_PRIVATE_KEY`: Terraform で作成した`chatbot-sa-key.json`ファイルの`private_key`フィールドの値

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

#### 4. Terraform で作成したサービスアカウントの認証エラー

```text
Error: Invalid private key format
Error: Service account not found
```

**解決方法**:

1. Terraform で作成した`chatbot-sa-key.json`ファイルの`private_key`フィールドの値を正しくコピーしているか確認
2. サービスアカウントのメールアドレスが正しく設定されているか確認
3. Terraform の`iap_members`にサービスアカウントが追加されているか確認

詳細なデバッグコマンドは、メインの README.md の「デバッグコマンド」セクションを参照してください。

#### 5. IAP 認証エラー

```text
Error: IAP access denied
```

**解決方法**:

1. Terraform の`iap_members`に ChatBot 用サービスアカウントが追加されているか確認
2. サービスアカウントに IAP アクセス権限が付与されているか確認

詳細なデバッグコマンドは、メインの README.md の「デバッグコマンド」セクションを参照してください。

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
