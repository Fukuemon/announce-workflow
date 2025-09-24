# GAS による登壇者情報自動処理システム

Google Form で収集した登壇者情報から、画像処理・イベント掲載文生成・Google Chat での承認フローを経て、n8n への通知まで行うワークフローシステムの GAS 部分の詳細設計。

## システム概要

### 処理フロー

```plantuml
@startuml gas_flowchart

title GAS処理フローチャート

start

:Google Form回答受信;
:onFormSubmit トリガー実行;

:回答データ取得;
:画像ファイル情報抽出;

if (画像ファイルあり?) then (Yes)
    :Google Drive から画像取得;
    :画像ファイルを検証・圧縮;
    :Cloud Storage にアップロード;
    :公開URL取得;
    :SpreadsheetにURL保存;
else (No)
    :デフォルト画像URL設定;
endif

:イベントページ掲載文生成;
:Spreadsheetに掲載文保存;

:Google Chatカード形式で通知作成;
:Google Chat通知送信;

if (送信成功?) then (Yes)
    :処理完了ログ記録;
else (No)
    :エラーログ記録;
endif

:承認ボタンクリック待機;
:承認/却下処理;
:スプレッドシート更新;
:n8n Webhook通知（IAP認証）;

stop

@enduml
```

## アーキテクチャ

### ファイル構成

```text
src/
├── main.ts              # メイン処理（onFormSubmit）
├── chatHandler.ts       # Chat App ハンドラ（承認/却下）
├── config.ts            # 設定値管理
├── imageProcessor.ts    # 画像処理（GCS アップロード）
├── nortificationService.ts # Chat API 通知サービス
├── templateEngine.ts    # イベントページ文生成
├── columnMapping.ts     # スプレッドシート列マッピング
├── sheetFinder.ts       # シート検索
├── setupProperties.ts   # プロパティ設定
├── authService.ts       # 認証サービス（IAP/JWT）
└── type.ts             # 型定義
```

### 主要コンポーネント

#### 1. メイン処理（main.ts）

- `onFormSubmit`: Google Form 回答受信時のトリガー処理
- `manualTestWorkflow`: 手動テスト用エントリポイント

#### 2. Chat ハンドラ（chatHandler.ts）

- `handleApprovePost`: 承認ボタン処理
- `handleRejectPost`: 却下ボタン処理
- `onCardClick`: カードクリックイベント処理
- `onMessage`: メッセージ受信処理

#### 3. 通知サービス（nortificationService.ts）

- `sendChatCardV2`: Chat API でカード送信
- `updateChatMessage`: メッセージ更新
- `buildApprovalCard`: 承認カード生成
- Service Account 認証処理

#### 4. 画像処理（imageProcessor.ts）

- `uploadImageToGCS`: GCS への画像アップロード
- `extractFileIdFromUrl`: Google Drive URL からファイル ID 抽出
- `validateImageFile`: 画像ファイル検証
- `compressImage`: 画像圧縮（JPEG 形式に統一）

#### 5. 認証サービス（authService.ts）

- `postToIapProtectedWebhook`: IAP 保護エンドポイントへの認証付き POST
- `fetchServiceAccountAccessToken`: Service Account アクセストークン取得
- `fetchServiceAccountIdToken`: ID トークン取得
- JWT 生成と IAP 認証処理

## データモデル設計

### スプレッドシート列マッピング

#### フォーム列（部分一致によるマッピング）

| 内部キー            | 部分一致キーワード                   | 実際のカラム名例                  | データ型 |
| ------------------- | ------------------------------------ | --------------------------------- | -------- |
| timestamp           | タイムスタンプ, 時刻, 日時           | タイムスタンプ                    | DateTime |
| name                | お名前, 名前, 氏名                   | お名前                            | String   |
| name_kana           | フリガナ, ふりがな, カナ             | お名前(フリガナ)                  | String   |
| email               | メールアドレス, メール, email        | メールアドレス                    | String   |
| affiliation         | 所属, ご所属, 会社                   | ご所属                            | String   |
| title               | 肩書, 役職, 職種                     | 肩書                              | String   |
| portrait_image      | ポートレート, 画像, アイコン, 写真   | ポートレート画像またはアイコン... | String   |
| bio                 | 自己紹介, 紹介文, プロフィール       | 自己紹介文                        | Text     |
| session_title       | セッションタイトル, タイトル, 題名   | セッションタイトル(仮題可)        | String   |
| session_description | セッション概要, 概要, 内容           | セッション概要                    | Text     |
| connpass_id         | connpass, コンパス                   | connpass ID                       | String   |
| x_account           | X アカウント, Twitter, ツイッター, X | X アカウント                      | String   |

#### 追加列（自動生成）

| 内部キー          | カラム名             | 例                                   | データ型 |
| ----------------- | -------------------- | ------------------------------------ | -------- |
| portrait_gcs_url  | ポートレート画像 URL | `https://storage.googleapis.com/...` | String   |
| event_page_text   | イベントページ掲載文 | 【登壇者紹介】佐藤一憲さん...        | Text     |
| sns_post_text     | SNS 投稿文           | 🎉 登壇者紹介 🎉\n 佐藤一憲さん...   | Text     |
| post_status       | 投稿ステータス       | pending/approved/posted              | String   |
| post_url          | 投稿 URL             | `https://x.com/example/status/...`   | String   |
| chat_message_name | Chat メッセージ名    | `spaces/xxx/messages/yyy`            | String   |
| chat_thread_key   | Chat スレッドキー    | `row-123`                            | String   |
| post_timestamp    | 投稿日時             | 2025-01-01 12:00:00                  | DateTime |
| review_note       | レビューコメント     | 承認時のコメント                     | Text     |

## Google Chat 統合

### Chat App 設定

- **接続方式**: Apps Script を接続先に設定
- **イベントハンドラ**: `onMessage`, `onCardClick`, `onAddToSpace`, `onRemoveFromSpace`
- **認証**: Service Account による JWT 認証
- **スコープ**: `https://www.googleapis.com/auth/chat.bot`, `https://www.googleapis.com/auth/chat.messages`

### カード構造

```json
{
  "cardsV2": [
    {
      "cardId": "confirm-row-123",
      "card": {
        "header": {
          "title": "登壇者承認",
          "subtitle": "登壇者名",
          "imageUrl": "https://storage.googleapis.com/..."
        },
        "sections": [
          {
            "widgets": [
              {
                "textParagraph": {
                  "text": "イベントページ掲載文..."
                }
              }
            ]
          },
          {
            "widgets": [
              {
                "buttonList": {
                  "buttons": [
                    {
                      "text": "承認",
                      "onClick": {
                        "action": {
                          "function": "approve_post",
                          "parameters": [
                            { "key": "rowId", "value": "row-123" },
                            { "key": "cardId", "value": "confirm-row-123" }
                          ]
                        }
                      }
                    },
                    {
                      "text": "却下",
                      "onClick": {
                        "action": {
                          "function": "reject_post",
                          "parameters": [
                            { "key": "rowId", "value": "row-123" },
                            { "key": "cardId", "value": "confirm-row-123" }
                          ]
                        }
                      }
                    }
                  ]
                }
              }
            ]
          }
        ]
      }
    }
  ]
}
```

### 承認フロー

1. **承認時**:

   - `post_status` を `approved` に更新
   - `post_timestamp` を記録
   - n8n Webhook に POST
   - カードを更新して結果を表示

2. **却下時**:
   - `post_status` を `pending` に更新
   - カードを更新して結果を表示

## 画像処理

### 処理方針

- **リサイズなし**: アスペクト比を保持
- **圧縮のみ**: JPEG 形式に統一
- **検証**: MIME タイプとサイズ上限チェック（5MB）
- **フォールバック**: エラー時はデフォルト画像を使用

### 画像処理フロー

1. Google Drive URL からファイル ID 抽出
2. Google Drive から画像取得
3. MIME タイプ検証（`image/jpeg`, `image/png`, `image/gif`, `image/webp`）
4. サイズ検証（デフォルト: 5MB）
5. JPEG 形式に圧縮
6. GCS にアップロード（`speaker-images/{sanitizedName}_{timestamp}.jpg`）
7. 公開 URL をスプレッドシートに保存

## イベントページ掲載文生成

### テンプレート

```markdown
## {{セッションタイトル}}

{{セッション概要}}

### 登壇者：{{登壇者名}} 氏

X:{{Xアカウント}}

- {{所属}}
- {{肩書}}

<img src="{{ポートレート画像URL}}" alt="ポートレート" width="160">

> **登壇者について** > {{自己紹介文}}
```

## 設定管理

### スクリプトプロパティ

| プロパティ名          | 説明                   | 例                                                 |
| --------------------- | ---------------------- | -------------------------------------------------- |
| GCS_BUCKET_NAME       | GCS バケット名         | `announce-workflow-speaker-images-local`           |
| GCS_PROJECT_ID        | GCP プロジェクト ID    | `gdg-event-workflow-472702`                        |
| GOOGLE_CHAT_SPACE_ID  | Chat スペース ID       | `spaces/AAQA7NRvzpU`                               |
| SA_CLIENT_EMAIL       | Service Account メール | `bot@project.iam.gserviceaccount.com`              |
| SA_PRIVATE_KEY        | Service Account 秘密鍵 | `-----BEGIN PRIVATE KEY-----...`                   |
| SPREADSHEET_ID        | スプレッドシート ID    | `1lDecpnD2C6RsaAu8Ss1-gJLGYKfMgMQmcAHioMo7an8`     |
| SHEET_NAME            | シート名               | `フォームの回答`                                   |
| N8N_WEBHOOK_URL       | n8n Webhook URL        | `https://n8n.example.com/webhook/speaker-approval` |
| CLOUD_RUN_SERVICE_URL | Cloud Run サービス URL | `https://n8n-prod-xxx.run.app`                     |

### イベント設定

| プロパティ名  | 説明         | デフォルト値                                    |
| ------------- | ------------ | ----------------------------------------------- |
| EVENT_NAME    | イベント名   | `DevFest 2025 Kansai`                           |
| EVENT_DATE    | イベント日時 | `2025/12/14(土) 13:00-17:00`                    |
| EVENT_URL     | イベント URL | `https://gdg-kansai.connpass.com/event/example` |
| EVENT_HASHTAG | ハッシュタグ | `DevFest2025Kansai`                             |

## ビルド・デプロイ

### 開発環境

```bash
# 依存関係インストール
npm install

# ビルド
npm run build

# Google Apps Script にデプロイ
clasp push
```

### ビルド設定（esbuild.cjs）

- TypeScript コンパイル
- GAS プラグイン適用
- グローバル関数のバナー生成
- バンドル化

## セキュリティ

### 認証

- Service Account による JWT 認証
- Google Chat API の OAuth 2.0
- Google Drive API の OAuth 2.0
- n8n Webhook への IAP 認証（JWT 直接送信方式）

### データ保護

- 機密情報はスクリプトプロパティで管理
- 画像は GCS の公開バケットに保存
- ログには機密情報を含まない

## エラーハンドリング

### エラー処理方針

1. **画像処理エラー**: デフォルト画像にフォールバック
2. **Chat API エラー**: ログ記録とエラー通知
3. **スプレッドシートエラー**: ログ記録
4. **n8n Webhook エラー**: ログ記録（処理は継続）
5. **認証エラー**: ログ記録とエラー通知

### ログ出力

- 処理開始・終了ログ
- エラー詳細とスタックトレース
- デバッグ情報（設定で有効/無効切り替え）

## 注意事項

- スプレッドシートのシート名は「フォームの回答」を含むものを検出
- 無駄な絵文字は使用しない
- 画像は最大 5MB まで
- サポート画像形式: JPEG, PNG, GIF, WebP
