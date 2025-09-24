/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

################################################################################
# 環境設定
################################################################################
variable "env" {
  description = "デプロイ環境"
  type        = string
  default     = "prod"
}

variable "project_id" {
  description = "GCPのプロジェクトID"
  type        = string
}

variable "region" {
  description = "GCPのリージョン"
  type        = string
  default     = "asia-northeast1"
}

################################################################################
# n8n設定
################################################################################
variable "n8n_image" {
  description = "n8n Docker image"
  type        = string
  default     = "n8nio/n8n:latest"
}

variable "n8n_encryption_key" {
  description = "n8n暗号鍵"
  type        = string
  sensitive   = true
}

variable "n8n_db_host" {
  description = "n8nデータベースホスト"
  type        = string
  sensitive   = true
}

variable "n8n_db_port" {
  description = "n8nデータベースポート"
  type        = string
  sensitive   = true
}

variable "n8n_db_database" {
  description = "n8nデータベース名"
  type        = string
  sensitive   = true
}

variable "n8n_db_user" {
  description = "n8nデータベースユーザー"
  type        = string
  sensitive   = true
}

variable "n8n_db_password" {
  description = "n8nデータベースパスワード"
  type        = string
  sensitive   = true
}

variable "supabase_ssl_cert" {
  description = "Supabase SSL証明書の内容"
  type        = string
  sensitive   = true
}

# n8n Basic認証パスワード
variable "n8n_basic_auth_password" {
  description = "n8n Basic認証のパスワード"
  type        = string
  sensitive   = true
}

################################################################################
# Cloud Run設定
################################################################################
variable "cpu_limit" {
  description = "Cloud RunサービスのCPU制限"
  type        = string
  default     = "1"
}

variable "memory_limit" {
  description = "Cloud Runサービスのメモリ制限"
  type        = string
  default     = "2Gi"
}

variable "min_instances" {
  description = "最小インスタンス数"
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "最大インスタンス数"
  type        = number
  default     = 3
}

variable "timeout" {
  description = "リクエストタイムアウト"
  type        = string
  default     = "300s"
}

################################################################################
# IAP設定
################################################################################
variable "iap_members" {
  description = "IAPアクセス権限を持つメンバー（ユーザー、グループ、サービスアカウント）"
  type        = list(string)
  default     = []
}

variable "support_email" {
  description = "IAP OAuth 2.0ブランドのサポートメールアドレス"
  type        = string
  default     = null
}

variable "application_title" {
  description = "IAP OAuth 2.0ブランドのアプリケーションタイトル"
  type        = string
  default     = null
}

################################################################################
# GCS設定
################################################################################
variable "force_destroy" {
  description = "バケット削除時にオブジェクトを強制削除するか"
  type        = bool
  default     = false # 本番環境では安全のためfalse
}

################################################################################
# IAM設定
################################################################################
variable "gcs_viewers" {
  description = "GCSオブジェクト閲覧権限を持つメンバー"
  type        = list(string)
  default     = []
}

variable "gcs_creators" {
  description = "GCSオブジェクト作成権限を持つメンバー"
  type        = list(string)
  default     = []
}

variable "gcs_admins" {
  description = "GCSバケット管理権限を持つメンバー"
  type        = list(string)
  default     = []
}

# サービスアカウント設定
variable "existing_service_account_email" {
  description = "既存のサービスアカウントのメールアドレス（GASで使用しているもの）"
  type        = string
  default     = null
}

variable "create_service_account" {
  description = "新しいサービスアカウントを作成するかどうか"
  type        = bool
  default     = true
}

# タグ設定
variable "tags" {
  description = "Additional tags"
  type        = map(string)
  default     = {}
}
