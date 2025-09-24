# n8n Workflows - 詳細説明

このディレクトリには、Speaker Announcement Workflowの具体的な実装ファイルが含まれています。

## ファイル一覧

| ファイル名 | 説明 | 用途 |
|-----------|------|------|
| `workflow.json` | n8nワークフローの完全な定義 | n8nへのインポート用 |
| `data_prosessing.js` | データ前処理ロジック | Code Nodeで使用 |
| `post_processing.js` | 後処理ロジック | Code Nodeで使用 |

## ワークフロー詳細

### ノード構成

1. **Webhook Trigger** (`af10a31e-b1f8-49ad-9948-a0a3ab44fe8d`)
   - エンドポイント: `/webhook/speaker-approval`
   - メソッド: POST
   - GASからの登壇者承認リクエストを受信

2. **Get Speaker Data** (`67d43cfb-3b7e-4086-97cf-e03759a60950`)
   - Google Sheetsから登壇者情報を取得
   - スプレッドシートID: `1lDecpnD2C6RsaAu8Ss1-gJLGYKfMgMQmcAHioMo7an8`
   - シート名: `フォームの回答 1`

3. **Data Preprocessing** (Code Node)
   - `data_prosessing.js`のロジックを実行
   - WebhookデータとSheetsデータの統合
   - データ検証と正規化

4. **Gemini Text Generation** (AI Node)
   - Google Gemini AIを使用
   - SNS投稿用コンテンツの生成
   - Twitter、LinkedIn用の投稿文を作成

5. **Post Processing** (Code Node)
   - `post_processing.js`のロジックを実行
   - AI出力の整形と検証
   - 最終レスポンスの生成

6. **Response** (Response Node)
   - 処理結果をGASに返却

## データフロー

### 入力データ

#### Webhook からのデータ

```json
{
  "body": {
    "email": "speaker@example.com",
    "name": "Speaker Name",
    "approval_status": "approved"
  }
}
```

#### Google Sheets からのデータ

```json
{
  "メールアドレス": "speaker@example.com",
  "お名前": "Speaker Name",
  "プロフィール": "Speaker profile text...",
  "所属": "Company Name",
  "登壇タイトル": "Presentation Title"
}
```

### 処理フロー

1. **データ受信**: WebhookとSheetsデータを同時に受信
2. **データ分類**: 入力ソースに基づいてデータを分類
3. **データ統合**: emailをキーとしてデータを統合
4. **検証**: 必須フィールドの存在確認
5. **AI生成**: 統合されたデータからSNS投稿を生成
6. **後処理**: 生成結果の整形と検証
7. **レスポンス**: 最終結果を返却

### 出力データ

```json
{
  "skip_processing": false,
  "speaker_data": {
    "email": "speaker@example.com",
    "name": "Speaker Name",
    "profile": "Speaker profile text...",
    "company": "Company Name",
    "title": "Presentation Title"
  },
  "generated_content": {
    "twitter_post": "🎤 新たな登壇者が決定しました！\n\n【Speaker Name】さん\n所属: Company Name\n\n「Presentation Title」\n\n#イベント名 #登壇者発表",
    "linkedin_post": "We're excited to announce our next speaker!\n\nSpeaker Name from Company Name will be presenting \"Presentation Title\"\n\nSpeaker profile text...\n\n#EventName #SpeakerAnnouncement"
  },
  "workflow_metadata": {
    "trigger_time": "2024-01-01T00:00:00.000Z",
    "source": "webhook",
    "processing_time_ms": 1500
  }
}
```

## エラーハンドリング

### データ不足エラー

```json
{
  "error": "Webhook と Sheet の入力が不足しています",
  "received_data": {
    "webhook_email": "",
    "sheet_items_count": 0
  }
}
```

### 重複処理スキップ

```json
{
  "skip_processing": true,
  "reason": "既に処理済みの登壇者です",
  "email": "speaker@example.com",
  "workflow_metadata": {
    "trigger_time": "2024-01-01T00:00:00.000Z",
    "source": "webhook"
  }
}
```

## 設定要件

### 必要な認証情報

1. **Google Sheets OAuth2**
   - スプレッドシートへの読み取り権限
   - 認証名: `Google Sheets account`

2. **Google AI Studio API**
   - Gemini AI APIキー
   - 環境変数: `GOOGLE_AI_API_KEY`

### スプレッドシート設定

- **共有設定**: n8nのサービスアカウントに読み取り権限を付与
- **シート構造**: 以下のカラムが必要
  - `メールアドレス`
  - `お名前`
  - `プロフィール`
  - `所属`
  - `登壇タイトル`

## デバッグ情報

### ログ出力

各Code Nodeで以下の情報をログ出力しています：

```javascript
// data_prosessing.js
console.log("Webhook data:", JSON.stringify(webhookData));
console.log("Sheet items count:", sheetItems.length);
console.log("Email from webhook:", emailFromWebhook);

// post_processing.js
console.log("[Post Processing] 処理をスキップします。理由:", skipData.reason);
```

### 実行時間の測定

ワークフローの実行時間を測定し、メタデータに含めています：

```javascript
const startTime = Date.now();
// ... 処理 ...
const processingTime = Date.now() - startTime;
```

## カスタマイズポイント

### 1. データマッピングの変更

`data_prosessing.js`で、Sheetsのカラム名を変更できます：

```javascript
// 現在の設定
const emailFromSheet = item["メールアドレス"];
const nameFromSheet = item["お名前"];

// カスタマイズ例
const emailFromSheet = item["Email Address"];
const nameFromSheet = item["Full Name"];
```

### 2. AIプロンプトの調整

Gemini AIのプロンプトを調整して、生成されるコンテンツをカスタマイズできます。

### 3. 出力形式の変更

`post_processing.js`で、最終的な出力形式を変更できます。

## パフォーマンス最適化

### 並列処理

- WebhookとSheetsデータの取得を並列実行
- AI生成とデータ処理の最適化

### キャッシュ

- 重複処理の検出とスキップ
- 処理結果の一時保存

## セキュリティ考慮事項

### データ保護

- 個人情報の適切な処理
- ログからの機密情報除外

### アクセス制御

- Basic認証によるn8nアクセス制御
- API認証の適切な設定

## 関連ファイル

- [メインREADME](../README.md)
- [Terraform設定](../../terraform/README.md)
- [GAS設定](../../gas/README.md)