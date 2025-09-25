# Terraform 構成

設計・実装については以下に記載

- [Terraform 構築時のルール](../.cursor/rules/terraform.mdc)

## アーキテクチャ概要

この Terraform 構成は、**announce-workflow**プロジェクトのインフラストラクチャを管理します。

### ディレクトリ構造

```bash
terraform/
├── resource_modules/          # 個別リソースモジュール
│   ├── compute/cloud_run/v2/  # Cloud Run v2サービス
│   ├── security/
│   │   ├── iam_iap_cloudrun/  # IAP + IAM設定
│   │   └── secret-manager/simple-secret/  # Secret Manager
│   ├── storage/gcs/simple_bucket/  # GCSバケット
│   └── template/              # テンプレート用
├── infra_modules/            # インフラモジュール
│   ├── n8n/                  # n8nアプリケーション全体
│   ├── storage/              # ストレージ関連
│   └── template/             # テンプレート用
└── composition/              # 環境別設定
    └── asia-northeast1/
        ├── prod/            # 本番環境
        └── local/           # ローカル環境（GCSのみ）
```

## 環境別構成

### ローカル環境 (`local`)

- **Google Cloud Storage(GCS)**
  - 登壇者画像の保存用
  - 公開アクセス可能（`allUsers`に閲覧権限付与）

ローカル時は Docker でホストマシン上に n8n を構築するため、GCS のみで構成

### 本番環境 (`prod`)

- **Google Cloud Run v2**
  - n8n アプリケーションのホスティング
  - Basic 認証によるアクセス制御
  - Supabase PostgreSQL への接続
- **Google Secret Manager**
  - n8n の暗号鍵
  - Supabase データベース接続情報
  - SSL 証明書
  - Basic 認証パスワード
- **Google Cloud Storage(GCS)**
  - 登壇者画像の保存用
  - 適切な IAM 権限設定

## 環境構築手順

### 前提条件

- **Google Cloud Platform アカウント**: GCP プロジェクトの作成と管理権限
- **Terraform**: バージョン 1.0 以上
- **Google Cloud CLI**: 認証とプロジェクト設定用
- **Supabase プロジェクト**: PostgreSQL データベース

### 1. Google Cloud Platform の設定

#### 1.1 プロジェクトの作成

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 「プロジェクトの選択」→「新しいプロジェクト」をクリック
3. プロジェクト名を入力（例: `announce-workflow-prod`）
4. 「作成」をクリック

#### 1.2 必要な API の有効化

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
  iap.googleapis.com
```

#### 1.3 ChatBot 用サービスアカウントの作成

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

**重要**: このサービスアカウントのメールアドレス（`chatbot-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com`）を記録しておいてください。後で`terraform.tfvars`の`iap_members`に追加します。

### 2. n8n 用の環境変数・シークレットの準備

#### 2.1 n8n 暗号鍵の生成

n8n の暗号鍵を生成します：

```bash
# 32文字のランダム文字列を生成
openssl rand -hex 32
```

#### 2.2 Supabase 接続情報の準備

Supabase プロジェクトから以下の情報を取得します：

1. **Supabase プロジェクト**にアクセス
2. **Settings** → **Database** から接続情報を取得
3. **Connection pooling** の設定を確認（推奨: `Session` モード）

必要な情報：

- **Host**: `aws-1-ap-northeast-1.pooler.supabase.com`（例）
- **Port**: `6543`（プーリング）または `5432`（直接接続）
- **Database**: `postgres`
- **User**: `postgres.vsueaempwngmewqaxyls`（例）
- **Password**: Supabase で設定したパスワード

#### 2.3 Supabase SSL 証明書の取得

```bash
# Supabase SSL証明書をダウンロード
curl -o supabase-ca.crt https://storage.googleapis.com/supabase-ca/supabase-ca.crt

# 証明書の内容を確認
cat supabase-ca.crt
```

#### 2.4 Basic 認証パスワードの設定

n8n の Basic 認証用のパスワードを設定します：

```bash
# 安全なパスワードを生成
openssl rand -base64 32
```

### 3. Terraform 設定ファイルの準備

#### 3.1 設定ファイルの作成

```bash
# 本番環境の場合
cd terraform/composition/asia-northeast1/prod
cp terraform.tfvars.sample terraform.tfvars

# ローカル環境の場合
cd terraform/composition/asia-northeast1/local
cp terraform.tfvars.sample terraform.tfvars
```

#### 3.2 設定値の入力

`terraform.tfvars`ファイルを編集し、以下の値を設定：

**本番環境 (`prod`) の場合：**

```hcl
# プロジェクト設定
project_id = "your-gcp-project-id"

# n8n設定
n8n_image = "n8nio/n8n:latest"
n8n_encryption_key = "your-generated-encryption-key"
n8n_db_host = "aws-1-ap-northeast-1.pooler.supabase.com"
n8n_db_port = "6543"
n8n_db_database = "postgres"
n8n_db_user = "postgres.vsueaempwngmewqaxyls"
n8n_db_password = "your-supabase-password"
supabase_ssl_cert = "-----BEGIN CERTIFICATE-----\nYOUR_BASE64_ENCODED_CERT_CONTENT_HERE\n-----END CERTIFICATE-----"

# n8n Basic認証パスワード
n8n_basic_auth_password = "your-secure-password-here"

# サービスアカウント設定
existing_service_account_email = "your-existing-sa@your-project.iam.gserviceaccount.com"
create_service_account = false

# IAP設定（アクセスを許可するユーザー・グループ・サービスアカウント）
iap_members = [
  "user:your-email@example.com",
  "group:your-group@example.com",
  "serviceAccount:chatbot-sa@your-project.iam.gserviceaccount.com"
]

# Cloud Run設定
cpu_limit     = "1"
memory_limit  = "2Gi"
min_instances = 0
max_instances = 3
timeout       = "300s"

# GCS設定
force_destroy = false

# IAM設定
gcs_viewers  = []
gcs_creators = []
gcs_admins   = []
```

**ローカル環境 (`local`) の場合：**

```hcl
# 環境設定
env        = "local"
project_id = "your-gcp-project-id"

# GCS設定
location      = "ASIA-NORTHEAST1"
force_destroy = true

# IAM設定（画像公開のため allUsers に閲覧権限を付与）
gcs_viewers = ["allUsers"]
```

### 4. Terraform 実行

#### 4.1 初期化とプラン

```bash
# Terraformの初期化
terraform init

# 実行プランの確認
terraform plan
```

#### 4.2 リソースの作成

```bash
# リソースの作成
terraform apply
```

### 5. デプロイ後の確認

#### 5.1 出力値の確認

```bash
# 出力値を確認
terraform output
```

重要な出力値：

- `n8n_service_url`: n8n サービスの URL
- `gcs_bucket_name`: GCS バケット名
- `gcs_bucket_url`: GCS バケットの URL

#### 5.2 n8n サービスのアクセス確認

1. 出力された`n8n_service_url`にアクセス
2. Basic 認証（ユーザー名: `admin`、パスワード: 設定した値）でログイン
3. n8n の初期設定を完了

#### 5.3 GCS バケットの確認

```bash
# バケットの内容を確認
gsutil ls gs://your-bucket-name

# テストファイルのアップロード
echo "test" | gsutil cp - gs://your-bucket-name/test.txt
```

### 6. ChatBot 用サービスアカウントの設定

#### 6.1 ChatBot 用サービスアカウントの確認

先ほど作成した ChatBot 用サービスアカウントの情報を確認してください：

- **サービスアカウントのメールアドレス**: `chatbot-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com`
- **JSON キーファイル**: `chatbot-sa-key.json`

#### 6.2 Terraform 設定の更新

`terraform.tfvars` で ChatBot 用サービスアカウントを IAP メンバーに追加：

```hcl
# IAP設定（アクセスを許可するユーザー・グループ・サービスアカウント）
iap_members = [
  "user:your-email@example.com",
  "group:your-group@example.com",
  "serviceAccount:chatbot-sa@your-project.iam.gserviceaccount.com"
]
```

#### 6.3 GAS 設定での活用

作成した JSON キーファイル（`chatbot-sa-key.json`）を GAS の設定で使用します：

- **SA_CLIENT_EMAIL**: `chatbot-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com`
- **SA_PRIVATE_KEY**: JSON キーファイルの`private_key`フィールドの値

### 7. トラブルシューティング

#### 7.1 よくある問題

- **認証エラー**: サービスアカウントの権限を確認
- **Basic 認証エラー**: `n8n_basic_auth_password`の設定を確認
- **Secret Manager アクセス拒否**: Cloud Run サービスアカウントの権限を確認
- **Supabase 接続エラー**: SSL 証明書と接続情報を確認
- **IAP アクセス拒否**: `iap_members`に ChatBot 用サービスアカウントが正しく設定されているか確認
- **GAS ChatBot エラー**: ChatBot 用サービスアカウントの JSON キーが正しく設定されているか確認

#### 7.2 ログの確認

```bash
# Cloud Runサービスのログを確認
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=n8n-prod" --limit=50

# Secret Managerのアクセスログを確認
gcloud logging read "resource.type=secretmanager.googleapis.com/Secret" --limit=20
```

#### 7.3 よくある解決方法

**Supabase 接続エラーの場合：**

```bash
# SSL証明書の再ダウンロード
curl -o supabase-ca.crt https://storage.googleapis.com/supabase-ca/supabase-ca.crt

# 接続情報の確認
gcloud secrets versions access latest --secret="n8n-db-host-prod"
```

**Basic 認証が効かない場合：**

```bash
# パスワードの確認
gcloud secrets versions access latest --secret="n8n-basic-auth-password-prod"

# Cloud Runサービスの再デプロイ
gcloud run services replace service.yaml --region=asia-northeast1
```

**ChatBot 用サービスアカウントの権限エラーの場合：**

```bash
# ChatBot用サービスアカウントの権限確認
gcloud projects get-iam-policy YOUR_PROJECT_ID \
  --flatten="bindings[].members" \
  --format="table(bindings.role)" \
  --filter="bindings.members:chatbot-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com"

# 必要に応じて権限を再付与
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:chatbot-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:chatbot-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectCreator"
```

**IAP アクセス拒否の場合：**

```bash
# IAPメンバーの確認
gcloud iap web get-iam-policy --resource-type=app-engine

# ChatBot用サービスアカウントをIAPメンバーに追加
gcloud iap web add-iam-policy-binding \
  --member="serviceAccount:chatbot-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iap.httpsResourceAccessor"
```

### 8. セキュリティのベストプラクティス

- **暗号鍵の管理**: 定期的なローテーションを検討
- **アクセス権限**: 最小権限の原則に従う
- **監査ログ**: Cloud Audit Logs の有効化
- **Basic 認証**: 強力なパスワードの使用
- **SSL/TLS**: Supabase 接続での SSL 証明書の使用

---

## 構築済みのモジュール

### Google Cloud Storage

#### GCS の出力値

- `gcs_bucket_name`: 作成されたバケット名
- `gcs_bucket_url`: バケットの URL
- `gcs_bucket_location`: バケットのロケーション

#### GCS の特徴

- **セキュリティ**: バケットレベルアクセス制御、暗号化対応
- **ライフサイクル**: 90 日経過後の自動削除ルール
- **バージョニング**: オブジェクトのバージョン管理
- **IAM**: 閲覧・作成・管理権限の細かい制御
- **タグ**: 環境・プロジェクト・サービス種別の自動タグ付け

### Google Cloud Run v2 (n8n)

#### Cloud Run v2 の出力値

- `n8n_service_url`: デプロイされた n8n サービスの run.app URL
- `service_account_email`: n8n Cloud Run サービスアカウントのメールアドレス

#### Cloud Run v2 の特徴

- **セキュリティ**: Basic 認証、Secret Manager
- **IAM**: サービス・Secrets に最小権限付与
- **タグ**: 環境・プロジェクト・サービス種別の自動タグ付け
- **スケーリング**: 最小・最大インスタンス数の設定可能
- **環境変数**: Secret Manager から暗号鍵と DB 接続情報を自動注入
- **ボリューム**: Supabase SSL 証明書のマウント

### Google Secret Manager

#### Secret Manager の出力値

- `encryption_key_secret_name`: n8n 暗号鍵の Secret 名
- `db_host_secret_name`: n8n データベースホストの Secret 名
- `db_port_secret_name`: n8n データベースポートの Secret 名
- `db_database_secret_name`: n8n データベース名の Secret 名
- `db_user_secret_name`: n8n データベースユーザーの Secret 名
- `db_password_secret_name`: n8n データベースパスワードの Secret 名
- `supabase_ssl_cert_secret_name`: Supabase SSL 証明書の Secret 名
- `basic_auth_password_secret_name`: n8n Basic 認証パスワードの Secret 名

#### Secret Manager の特徴

- **セキュリティ**: 暗号化されたシークレット管理
- **アクセス制御**: Cloud Run サービスアカウントに最小権限付与
- **バージョン管理**: シークレットのバージョン管理対応
- **個別管理**: 各設定項目を個別の Secret として管理
