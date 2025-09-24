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

# プロジェクト設定
variable "project_id" {
  description = "Google Cloud Project ID"
  type        = string
}

variable "project_name" {
  description = "Project name for tagging"
  type        = string
  default     = "announce-workflow"
}

variable "region" {
  description = "GCP region for deployment"
  type        = string
  default     = "asia-northeast1"
}

# アプリケーション設定
variable "app_name" {
  description = "Application name"
  type        = string
  default     = "n8n"
}

variable "env" {
  description = "Environment (dev, staging, prod)"
  type        = string
}

# n8n設定
variable "n8n_image" {
  description = "n8n Docker image"
  type        = string
  default     = "n8nio/n8n:latest"
}

variable "n8n_webhook_url" {
  description = "n8n Webhook URL (Cloud Run service URL)"
  type        = string
  default     = ""
}

variable "n8n_encryption_key" {
  description = "n8n encryption key"
  type        = string
  sensitive   = true
}

variable "n8n_db_host" {
  description = "n8n database host"
  type        = string
  sensitive   = true
}

variable "n8n_db_port" {
  description = "n8n database port"
  type        = string
  sensitive   = true
}

variable "n8n_db_database" {
  description = "n8n database name"
  type        = string
  sensitive   = true
}

variable "n8n_db_user" {
  description = "n8n database user"
  type        = string
  sensitive   = true
}

variable "n8n_db_password" {
  description = "n8n database password"
  type        = string
  sensitive   = true
}

variable "supabase_ssl_cert" {
  description = "Supabase SSL certificate content"
  type        = string
  sensitive   = true
}

# n8n Basic認証パスワード
variable "n8n_basic_auth_password" {
  description = "n8n basic authentication password"
  type        = string
  sensitive   = true
}

# Cloud Run設定
variable "cpu_limit" {
  description = "CPU limit for Cloud Run service"
  type        = string
  default     = "1"
}

variable "memory_limit" {
  description = "Memory limit for Cloud Run service"
  type        = string
  default     = "2Gi"
}

variable "min_instances" {
  description = "Minimum number of instances"
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Maximum number of instances"
  type        = number
  default     = 3
}

variable "timeout" {
  description = "Request timeout"
  type        = string
  default     = "300s"
}

# IAP設定
variable "iap_members" {
  description = "List of members to grant IAP access"
  type        = list(string)
  default     = []
}

variable "support_email" {
  description = "Support email for IAP OAuth 2.0 brand"
  type        = string
  default     = null
}

variable "application_title" {
  description = "Application title for IAP OAuth 2.0 brand"
  type        = string
  default     = null
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

# API依存関係
variable "api_dependencies" {
  description = "API dependencies for proper resource creation order"
  type        = any
  default     = []
}
