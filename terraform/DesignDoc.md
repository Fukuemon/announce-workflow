# n8n on Google Cloud Run 設計書

## 1\. 目的 / スコープ

### 目的

- **n8n** を **Google Cloud Run v2** 上でホスティングし、社内利用（Basic 認証）および GAS からの自動呼び出し（Webhook/Basic 認証）に対応する。
- Terraform の規約（`resource_modules` / `infra_modules` / `composition`）に従い、**再現性・保守性の高い構成**を提供する。

### スコープ

#### 含む

- **Cloud Run v2**（n8n 公式 Docker イメージ利用）
- **Basic 認証**（UI / Webhook ともに保護）
- GAS から Basic 認証済み Webhook 呼び出し
- **Secret Manager**（暗号鍵・DB 認証情報・SSL 証明書・Basic 認証パスワード）
- **Supabase PostgreSQL** への接続
- **GCS**（登壇者画像保存）
- Cloud Logging / Monitoring

#### 除外（初期）

- Queue モード / Redis
- 外部 HTTPS LB（カスタムドメイン不要のため）
- Cloud SQL（DB は Supabase 利用）
- IAP（Basic 認証に変更）

---

## 2\. 環境

- **リージョン**: `asia-northeast1`（東京）
- **環境**: `prod`（本番環境）と `local`（ローカル環境）を構築
- **ドメイン**: `run.app` デフォルト URL 利用（カスタムドメイン不要）

---

## 3. 認証 / アクセス制御

- **Basic 認証** を Cloud Run サービスに直接設定する。
- **Basic 認証の設定**:
  - ユーザー名: `admin`（固定）
  - パスワード: Secret Manager で管理
- **GAS からの呼び出し**:
  - Basic 認証ヘッダーを付与して n8n の Webhook にアクセスする。
  - `Authorization: Basic <base64(username:password)>`

---

## 4. コンテナ / n8n 設定

- **ベースイメージ**: `n8nio/n8n:latest`
- **Cloud Run 環境変数（主要）**:
  - `N8N_ENCRYPTION_KEY`: Secret Manager から注入
  - `DB_TYPE`: `postgresdb`
  - `DB_POSTGRESDB_*`: Supabase 接続情報を Secret Manager から注入
  - `N8N_PROTOCOL`: `https`
  - `N8N_SECURE_COOKIE`: `true`
  - `N8N_HOST`: Cloud Run のホスト名 (例: `n8n-xxxxxx-uc.a.run.app`)
  - `WEBHOOK_URL`: `https://<your-run-app-host>/`
  - `N8N_LOG_LEVEL`: `info`
  - `N8N_LOG_OUTPUT`: `console`
  - `N8N_BASIC_AUTH_ACTIVE`: `true`
  - `N8N_BASIC_AUTH_USER`: `admin`
  - `N8N_BASIC_AUTH_PASSWORD`: Secret Manager から注入
- **ボリュームマウント**:
  - Supabase SSL 証明書を `/etc/ssl/certs` にマウント

---

## 5. データ永続化

- **DB**: **Supabase (PostgreSQL)** を利用
  - 月数百回程度の低トラフィックには十分対応可能。
  - Cloud Run からはインターネット経由で接続（初期は IP 制限なしで開始）。
  - 将来 IP 制限が必要になった場合は、**Cloud NAT** を導入し静的 Egress IP を確保する。
- **暗号鍵**: **Secret Manager** に格納し、固定値として利用する。
- **Basic 認証パスワード**: **Secret Manager** に格納し、固定値として利用する。
- **SSL 証明書**: **Secret Manager** に格納し、ボリュームマウントで利用する。
- **画像ファイル**: **GCS バケット**に保存（Terraform モジュールで管理）。

---

## 6. Terraform 構成

ディレクトリ構造は以下の規約に従う。

```bash
terraform/
├─ resource_modules/
│  ├─ compute/cloud_run/v2        # Cloud Run v2サービス
│  ├─ security/secret-manager     # Secrets
│  ├─ security/iam_iap_cloudrun   # IAP/IAM 関連（将来の拡張用）
│  └─ storage/gcs                 # GCS バケット
├─ infra_modules/
│  ├─ n8n                        # Cloud Run + Basic認証 + Secrets を組み合わせたモジュール
│  ├─ storage                     # ストレージ関連
│  └─ template                    # テンプレート用
└─ composition/
   └─ asia-northeast1/
      ├─ prod/                    # 本番環境
      └─ local/                   # ローカル環境（GCSのみ）
```

### `composition/prod` の主要変数

- `project_id`
- `region`: `asia-northeast1`
- `app_name`: `"n8n"`
- `n8n_encryption_key`: n8n 暗号鍵
- `n8n_db_*`: Supabase 接続情報
- `supabase_ssl_cert`: SSL 証明書
- `n8n_basic_auth_password`: Basic 認証パスワード
- `existing_service_account_email`: 既存のサービスアカウント
- `create_service_account`: 新規 SA 作成フラグ

---

## 7. GAS (Google Apps Script) 側の変更

- `N8N_WEBHOOK_URL` と `N8N_BASIC_AUTH_PASSWORD` をスクリプトプロパティに設定する。
- Basic 認証ヘッダーを生成し、Webhook 呼び出し時のヘッダーに含める。

```javascript
// Basic認証ヘッダーを生成する関数
function getBasicAuthHeader() {
  const username = "admin";
  const password = PropertiesService.getScriptProperties().getProperty(
    "N8N_BASIC_AUTH_PASSWORD"
  );
  const credentials = Utilities.base64Encode(`${username}:${password}`);
  return `Basic ${credentials}`;
}

const options = {
  method: "post",
  headers: {
    Authorization: getBasicAuthHeader(),
  },
  contentType: "application/json",
  payload: JSON.stringify(data),
};

UrlFetchApp.fetch(CONFIG.N8N_WEBHOOK_URL, options);
```

---

## 8. リソース設定（初期推奨）

- **CPU / メモリ**: 1 vCPU / 1–2 GiB
- **Concurrency**: 10
- **Max Instances**: 1–3
- **Timeout**: 180–300s
- **CPU Always ON**: OFF（コスト優先）

---

## 9. 監視 / 運用

- **Cloud Logging / Monitoring**:
  - サーバーエラー（5xx）、レイテンシ、コンテナ起動失敗などを対象にアラートを設定する。
- **バックアップ**:
  - Supabase 側で定期的なスナップショット、または手動でのバックアップを実施する。
- **Runbook（手順書）**:
  - デプロイ／ロールバック手順
  - Secret のローテーション手順
  - 暗号鍵変更時の影響と対応手順（認証情報の再暗号化が必要）

---

## 10. リスク / 留意事項

- **暗号鍵の変更**: 既存の認証情報 (credentials) がすべて無効になるため、影響が非常に大きい。変更は慎重に計画・実行すること。
- **Basic 認証パスワードの変更**: パスワード変更時は、GAS 側の設定も同時に更新する必要がある。
- **外部 SaaS からの Webhook**: 外部からのアクセスが必要になった場合、Basic 認証で保護された既存サービスとは別に、**公開専用の Cloud Run サービス**を追加でデプロイすることを推奨する。
- **Supabase の IP 制限**: 導入する場合は、Cloud Run の Egress IP を固定するために **Cloud NAT** の設定が追加で必要になる。
