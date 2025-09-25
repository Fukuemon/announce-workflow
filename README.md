# 登壇者情報告知自動化ワークフロー

Google Form で収集した登壇者情報から、LLM を活用して SNS 告知文を自動生成する n8n ワークフローシステムです。

## プロジェクト概要

### 目的

イベントの登壇者情報を効率的に収集・管理し、承認フローを経て自動的に SNS 告知文を生成・投稿するシステムを構築します。

### 主な機能

- **登壇者情報の自動収集**: Google Form による情報収集
- **承認フロー**: Google Chat を活用した承認プロセス
- **AI による告知文生成**: Gemini API を使用した SNS 投稿文の自動生成
- **画像管理**: Google Cloud Storage による登壇者画像の管理
- **ワークフロー自動化**: n8n による処理の自動化

## システム構成

### アーキテクチャ図

![フローのイメージ](./docs/diagram/workflow.drawio.png)

![CloudRunを利用した場合のインフラ](./docs/diagram/infra.drawio.png)

![n8nのワークフロー](./docs/diagram/n8n.drawio.png)

### コンポーネント詳細

| コンポーネント               | 役割                         | 技術スタック     |
| ---------------------------- | ---------------------------- | ---------------- |
| **Google Form**              | 登壇者情報収集               | Google Forms     |
| **Google Spreadsheet**       | データ管理・中央データベース | Google Sheets    |
| **GAS (Google Apps Script)** | データ加工・トリガー処理     | JavaScript       |
| **Google Cloud Storage**     | 画像ファイル管理             | GCS              |
| **n8n**                      | ワークフローエンジン         | Cloud Run v2     |
| **Gemini API**               | SNS 告知文生成               | Google AI Studio |
| **Google Chat**              | 承認フロー・通知システム     | Google Chat API  |

## ワークフロー詳細

### 1. 情報収集フェーズ

1. **登壇者応募**: Google Form で登壇者情報を収集
2. **データ保存**: Google Spreadsheet に情報を自動保存
3. **画像アップロード**: 登壇者画像を Google Cloud Storage に保存

### 2. 承認フェーズ

1. **承認リクエスト**: GAS が Google Chat に承認リクエストを送信
2. **承認処理**: 管理者が Google Chat で承認/却下を決定
3. **ステータス更新**: Spreadsheet の承認ステータスを更新

### 3. 告知文生成フェーズ

1. **ワークフロー起動**: 承認された登壇者情報で n8n ワークフローを起動
2. **データ統合**: Webhook データと Spreadsheet データを統合
3. **AI 生成**: Gemini API で SNS 告知文を生成
4. **結果返却**: 生成された告知文を GAS に返却

### 4. 投稿フェーズ

1. **告知文確認**: 生成された告知文を確認
2. **SNS 投稿**: Twitter、LinkedIn 等への投稿実行
3. **完了通知**: Google Chat に完了通知を送信

## ディレクトリ構成

```text
announce-workflow/
├── README.md                   # プロジェクト全体の概要
├── AGENTS.md                   # AI エージェント設定
├── compose.yml                 # Docker Compose 設定
├── supabase.env                # Supabase 環境変数
├── docs/                       # ドキュメント
│   ├── diagram/                # アーキテクチャ図
│   ├── few-shot/               # Few-shot プロンプト例
│   └── template/               # テンプレートファイル
├── gas/                        # Google Apps Script
│   ├── src/                    # ソースコード
│   ├── dist/                   # ビルド済みファイル
│   └── config.template.json    # 設定テンプレート
├── n8n/                        # n8n ワークフロー
│   └── workflows/              # ワークフロー定義
└── terraform/                  # インフラストラクチャ
    ├── resource_modules/       # リソースモジュール
    ├── infra_modules/          # インフラモジュール
    └── composition/             # 環境別設定
```

## 技術仕様

### フロントエンド

- **Google Forms**: 登壇者情報収集フォーム
- **Google Sheets**: データ管理と表示
- **Google Chat**: 承認フローと通知

### バックエンド

- **Google Apps Script**: サーバーレス処理
- **n8n**: ワークフローエンジン（Cloud Run v2）
- **Supabase**: PostgreSQL データベース

### AI・機械学習

- **Gemini API**: テキスト生成
- **Few-shot Learning**: プロンプトエンジニアリング

### インフラストラクチャ

- **Google Cloud Platform**:
  - Cloud Run v2 (n8n)
  - Cloud Storage (画像管理)
  - Secret Manager (認証情報管理)
- **Supabase**: PostgreSQL データベース

## セットアップ手順

### 1. 前提条件

- Google Cloud Platform アカウント
- Supabase アカウント
- Google AI Studio API キー
- Terraform 1.0 以上

### 2. Google Cloud Platform の設定

#### 2.1 プロジェクトの作成

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 「プロジェクトの選択」→「新しいプロジェクト」をクリック
3. プロジェクト名を入力（例: `announce-workflow-prod`）
4. 「作成」をクリック

#### 2.2 必要な API の有効化

以下の API を有効にします：

```bash
# Google Cloud CLIでログイン
gcloud auth login

# プロジェクトを設定
gcloud config set project YOUR_PROJECT_ID

# 必要なAPIを有効化
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  storage.googleapis.com \
  cloudbuild.googleapis.com \
  iap.googleapis.com \
  chat.googleapis.com \
  sheets.googleapis.com \
  drive.googleapis.com
```

#### 2.3 OAuth スコープの設定

Google Apps Script プロジェクトで必要な OAuth スコープを設定します：

```bash
# GASプロジェクトのOAuthスコープを設定
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="user:YOUR_EMAIL@example.com" \
  --role="roles/editor"

# または、特定のスコープのみを許可する場合
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="user:YOUR_EMAIL@example.com" \
  --role="roles/spreadsheet.editor"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="user:YOUR_EMAIL@example.com" \
  --role="roles/chat.bot"
```

**必要な OAuth スコープ**:

- `https://www.googleapis.com/auth/spreadsheets` - Google Sheets アクセス
- `https://www.googleapis.com/auth/drive` - Google Drive アクセス
- `https://www.googleapis.com/auth/chat.messages` - Google Chat Bot アクセス
- `https://www.googleapis.com/auth/cloud-platform` - Google Cloud Platform アクセス
- `https://www.googleapis.com/auth/devstorage.full_control` - Google Cloud Storage フルアクセス
- `https://www.googleapis.com/auth/script.external_request` - 外部 API リクエスト（n8n Webhook）

#### 2.4 ChatBot 用サービスアカウントの作成

GoogleChat 実行用のサービスアカウントを作成します：

```bash
# ChatBot用サービスアカウントの作成
gcloud iam service-accounts create chatbot-sa \
  --display-name="SpeakerAnnounceBot" \
  --description="Service account for Google Chat Bot operations"

# 必要な権限を付与
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:chatbot-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:chatbot-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectCreator"

# JSONキーの作成とダウンロード（GASで使用）
gcloud iam service-accounts keys create chatbot-sa-key.json \
  --iam-account=chatbot-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

**重要**: このサービスアカウントのメールアドレス（`chatbot-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com`）を記録しておいてください。後で Terraform の`iap_members`と GAS の設定で使用します。

### 3. Supabase の設定

#### 3.1 Supabase プロジェクトの作成

1. [Supabase](https://supabase.com/)にアクセス
2. 新しいプロジェクトを作成
3. データベース接続情報を取得

#### 3.2 接続情報の準備

Supabase プロジェクトから以下の情報を取得します：

1. **Supabase プロジェクト**にアクセス
2. **Settings** → **Database** から接続情報を取得
3. **Connection pooling** の設定を確認

必要な情報：

- **Host**: `aws-1-ap-northeast-1.pooler.supabase.com`（例）
- **Port**: `6543`（プーリング）または `5432`（直接接続）
- **Database**: `postgres`
- **User**: `postgres.vsueaempwngmewqaxyls`（例）
- **Password**: Supabase で設定したパスワード

#### 3.3 Supabase SSL 証明書の取得

Wip

### 4. Terraform によるインフラストラクチャ構築

```bash
# Terraform でインフラを構築
cd terraform/composition/asia-northeast1/prod
cp terraform.tfvars.sample terraform.tfvars
# terraform.tfvars を編集（ChatBot用サービスアカウントの情報を含める）
terraform init
terraform plan
terraform apply
```

**重要**: `terraform.tfvars`で以下の設定を行ってください：

```hcl
# ChatBot用サービスアカウントをIAPメンバーに追加
iap_members = [
  "user:your-email@example.com",
  "group:your-group@example.com",
  "serviceAccount:chatbot-sa@your-project.iam.gserviceaccount.com"
]

# GCS IAM設定（全員が閲覧可能、ChatBot用サービスアカウントが作成可能）
gcs_viewers = [
  "serviceAccount:chatbot-sa@your-project.iam.gserviceaccount.com",
  "allUsers"  # 全員が閲覧可能
]

gcs_creators = [
  "serviceAccount:chatbot-sa@your-project.iam.gserviceaccount.com"
]
```

詳細は [Terraform README](./terraform/README.md) を参照してください。

#### GCS IAM 設定について

上記の設定により、以下の権限が設定されます：

- **`allUsers`**: 全員が GCS オブジェクトを閲覧可能（公開アクセス）
- **`chatbot-sa`**: GCS オブジェクトの閲覧・作成権限

これにより、スピーカー画像が公開され、誰でもアクセスできるようになります。

**注意**: `allUsers`へのアクセス権を付与するには、GCP の組織ポリシーで`constraints/iam.allowedPolicyMemberDomains`の制限を解除する必要があります。

#### 組織ポリシーの変更手順

**問題**: `allUsers`へのアクセス権を付与する際に「One or more users named in the policy do not belong to a permitted customer」エラーが発生する場合があります。

**解決方法**:

1. **組織ポリシーの確認**：

   ```bash
   # 組織IDを確認
   gcloud organizations list

   # 組織レベルのポリシーを確認
   gcloud resource-manager org-policies list --organization=YOUR_ORGANIZATION_ID

   # 特定の制約を確認
   gcloud resource-manager org-policies describe constraints/iam.allowedPolicyMemberDomains --organization=YOUR_ORGANIZATION_ID
   ```

2. **プロジェクトレベルで制約を無効化**（推奨）：

   ```bash
   # プロジェクトレベルで制約を無効化
   gcloud resource-manager org-policies delete constraints/iam.allowedPolicyMemberDomains --project=gdg-test-workflow
   ```

3. **代替案**: Google Cloud Console での変更：
   - Google Cloud Console → IAM & Admin → Organization policies
   - `Allowed policy member domains` を探す
   - 該当する制約を「無効」に設定するか、`allUsers`を許可リストに追加

**注意**: 組織レベルのポリシーが設定されている場合、プロジェクトレベルでの無効化により`allUsers`へのアクセスが可能になります。

### 5. n8n ワークフロー設定

```bash
# n8n にワークフローをインポート
cd n8n/workflows
# workflow.json を n8n UI にインポート
```

**重要**: Terraform で作成した n8n サービスの URL を取得して、ワークフロー内の Webhook URL を更新してください。

詳細は [n8n README](./n8n/README.md) を参照してください。

### 6. GAS 設定

```bash
# GAS プロジェクトの設定
cd gas
npm run build
```

**重要**: GAS では `setupProperties.ts` を実行して ScriptProperty で設定を行います。以下の情報が必要です：

- `SA_CLIENT_EMAIL`: Terraform で作成した ChatBot 用サービスアカウントのメールアドレス
- `SA_PRIVATE_KEY`: Terraform で作成した`chatbot-sa-key.json`ファイルの`private_key`フィールドの値
- `N8N_WEBHOOK_URL`: Terraform で作成した n8n サービスの Webhook URL
- `CLOUD_RUN_SERVICE_URL`: Terraform で作成した n8n サービスの URL

詳細は [GAS README](./gas/README.md) を参照してください。

## 設定項目

### 環境変数

| 変数名                    | 説明                      | 設定場所                 |
| ------------------------- | ------------------------- | ------------------------ |
| `GOOGLE_AI_API_KEY`       | Gemini API キー           | n8n 環境変数             |
| `SUPABASE_URL`            | Supabase プロジェクト URL | Supabase                 |
| `SUPABASE_ANON_KEY`       | Supabase 匿名キー         | Supabase                 |
| `N8N_WEBHOOK_URL`         | n8n Webhook URL           | GAS ScriptProperty       |
| `N8N_BASIC_AUTH_PASSWORD` | n8n Basic 認証パスワード  | Terraform Secret Manager |

### Google サービス設定

- **Google Sheets**: スプレッドシートの共有設定
- **Google Chat**: Chat アプリの設定
- **Google Cloud Storage**: Terraform で作成したバケットの IAM 設定
- **ChatBot 用サービスアカウント**: Terraform で作成した`chatbot-sa`を使用

### Terraform で作成されるリソース

- **Cloud Run v2**: n8n アプリケーションのホスティング
- **Cloud Storage**: 登壇者画像の保存用バケット
- **Secret Manager**: n8n の暗号鍵、DB 接続情報、Basic 認証パスワード
- **IAM**: ChatBot 用サービスアカウントの権限設定
- **IAP**: n8n サービスへのアクセス制御

## 使用方法

### 1. 登壇者情報の収集

1. Google Form にアクセス
2. 登壇者情報を入力
3. 画像をアップロード
4. フォームを送信

### 2. 承認プロセス

1. Google Chat に承認リクエストが送信される
2. 管理者が承認/却下を決定
3. 承認された場合、n8n ワークフローが起動

### 3. 告知文の生成

1. n8n が登壇者情報を取得
2. Gemini API で告知文を生成
3. 生成結果を GAS に返却

### 4. SNS 投稿

1. 生成された告知文を確認
2. Twitter、LinkedIn 等に投稿
3. 完了通知を Google Chat に送信

## カスタマイズ

### 告知文のテンプレート変更

`docs/few-shot/` ディレクトリのプロンプト例を編集して、生成される告知文の形式を変更できます。

### ワークフローの拡張

`n8n/workflows/` ディレクトリのファイルを編集して、ワークフローをカスタマイズできます。

### 承認フローの変更

`gas/src/` ディレクトリのスクリプトを編集して、承認フローを変更できます。

## トラブルシューティング

### よくある問題

1. **n8n ワークフローが起動しない**

   - Webhook URL が正しいか確認（Terraform で作成した n8n サービスの URL）
   - Basic 認証の設定を確認（Terraform の Secret Manager で管理）
   - IAP 認証の設定を確認（ChatBot 用サービスアカウントが`iap_members`に含まれているか）

2. **Gemini API エラー**

   - API キーが正しく設定されているか確認
   - API 使用量制限に達していないか確認

3. **Google Sheets アクセスエラー**

   - スプレッドシートの共有設定を確認
   - GAS の認証設定を確認（Terraform で作成した ChatBot 用サービスアカウントの情報）

4. **Terraform で作成したサービスアカウントの認証エラー**

   - `chatbot-sa-key.json`ファイルの`private_key`フィールドの値が正しくコピーされているか確認
   - サービスアカウントのメールアドレスが正しく設定されているか確認
   - Terraform の`iap_members`にサービスアカウントが追加されているか確認

5. **IAP 認証エラー**

   - Terraform の`iap_members`に ChatBot 用サービスアカウントが追加されているか確認
   - サービスアカウントに IAP アクセス権限が付与されているか確認

### ログの確認

- **n8n**: Cloud Run のログを確認
- **GAS**: Google Apps Script の実行ログを確認
- **Terraform**: `terraform plan` で設定を確認
- **Secret Manager**: Terraform で作成したシークレットの内容を確認

### デバッグコマンド

```bash
# Terraformで作成したn8nサービスのURLを確認
terraform output n8n_service_url

# Secret Managerの内容を確認
gcloud secrets versions access latest --secret="n8n-basic-auth-password-prod"

# ChatBot用サービスアカウントの権限確認
gcloud projects get-iam-policy your-project-id \
  --flatten="bindings[].members" \
  --format="table(bindings.role)" \
  --filter="bindings.members:chatbot-sa@your-project.iam.gserviceaccount.com"

# IAPメンバーの確認
gcloud iap web get-iam-policy --resource-type=app-engine
```

## セキュリティ

### 認証・認可

- **Basic 認証**: n8n インスタンスへのアクセス制御
- **OAuth2**: Google サービスへの認証
- **API キー**: 外部 API への認証

### データ保護

- **暗号化**: Secret Manager による認証情報の暗号化
- **アクセス制御**: IAM による適切な権限設定
- **ログ管理**: 機密情報のログ除外

## 監視・運用

### 監視項目

- **ワークフロー実行状況**: n8n の実行ログ
- **API 使用量**: Gemini API の使用量
- **ストレージ使用量**: GCS の使用量
- **データベース性能**: Supabase の性能

### バックアップ

- **データベース**: Supabase の自動バックアップ
- **設定ファイル**: Git によるバージョン管理
- **ワークフロー**: n8n のエクスポート機能

## 関連ドキュメント

- [Terraform 設定](./terraform/README.md)
- [n8n ワークフロー](./n8n/README.md)
- [GAS 設定](./gas/README.md)
- [設計書](./terraform/DesignDoc.md)
