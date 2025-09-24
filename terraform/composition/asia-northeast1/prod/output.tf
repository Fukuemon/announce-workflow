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
# n8n Cloud Run サービス情報
################################################################################
output "n8n_service_url" {
  description = "n8n Cloud RunサービスのURL"
  value       = module.n8n.n8n_service_url
}

output "n8n_service_name" {
  description = "n8n Cloud Runサービスの名前"
  value       = module.n8n.n8n_service_name
}

output "n8n_service_id" {
  description = "n8n Cloud RunサービスのID"
  value       = module.n8n.n8n_service_id
}

################################################################################
# IAP設定
################################################################################
# IAP OAuth 2.0クライアントIDは手動で作成する必要があります
# output "iap_client_id" {
#   description = "GAS側からIDトークン発行に利用するIAP Client ID"
#   value       = module.n8n.iap_client_id
# }


################################################################################
# Secret Manager情報
################################################################################
output "encryption_key_secret_name" {
  description = "n8n暗号鍵のSecret名"
  value       = module.n8n.encryption_key_secret_name
}

output "db_host_secret_name" {
  description = "n8nデータベースホストのSecret名"
  value       = module.n8n.db_host_secret_name
}

output "db_port_secret_name" {
  description = "n8nデータベースポートのSecret名"
  value       = module.n8n.db_port_secret_name
}

output "db_database_secret_name" {
  description = "n8nデータベース名のSecret名"
  value       = module.n8n.db_database_secret_name
}

output "db_user_secret_name" {
  description = "n8nデータベースユーザーのSecret名"
  value       = module.n8n.db_user_secret_name
}

output "db_password_secret_name" {
  description = "n8nデータベースパスワードのSecret名"
  value       = module.n8n.db_password_secret_name
}

output "supabase_ssl_cert_secret_name" {
  description = "Supabase SSL証明書のSecret名"
  value       = module.n8n.supabase_ssl_cert_secret_name
}

################################################################################
# サービスアカウント情報
################################################################################
output "service_account_email" {
  description = "n8n Cloud Runサービスアカウントのメールアドレス"
  value       = module.n8n.service_account_email
}

output "service_account_member" {
  description = "n8n Cloud Runサービスアカウントのメンバー"
  value       = module.n8n.service_account_member
}

################################################################################
# GCS情報
################################################################################
output "gcs_bucket_name" {
  description = "作成されたGCSバケット名"
  value       = module.storage.bucket_name
}

output "gcs_bucket_url" {
  description = "GCSバケットのURL"
  value       = module.storage.bucket_url
}

output "gcs_bucket_location" {
  description = "GCSバケットのロケーション"
  value       = module.storage.bucket_location
}
