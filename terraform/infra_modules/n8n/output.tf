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

# Cloud Runサービス情報
output "n8n_service_url" {
  description = "n8n Cloud Run service URL"
  value       = module.n8n_cloud_run.service_uri
}

output "n8n_service_name" {
  description = "n8n Cloud Run service name"
  value       = module.n8n_cloud_run.service_name
}

output "n8n_service_id" {
  description = "n8n Cloud Run service ID"
  value       = module.n8n_cloud_run.service_id
}

# IAP OAuth 2.0クライアントIDは手動で作成する必要があります
# output "iap_client_id" {
#   description = "IAP client ID for generating ID tokens"
#   value       = module.n8n_cloud_run.iap_client_id
# }

# Secret Manager情報
output "encryption_key_secret_name" {
  description = "n8n encryption key secret name"
  value       = module.n8n_encryption_key.name
}

output "db_host_secret_name" {
  description = "n8n database host secret name"
  value       = module.n8n_db_host.name
}

output "db_port_secret_name" {
  description = "n8n database port secret name"
  value       = module.n8n_db_port.name
}

output "db_database_secret_name" {
  description = "n8n database name secret name"
  value       = module.n8n_db_database.name
}

output "db_user_secret_name" {
  description = "n8n database user secret name"
  value       = module.n8n_db_user.name
}

output "db_password_secret_name" {
  description = "n8n database password secret name"
  value       = module.n8n_db_password.name
}

output "supabase_ssl_cert_secret_name" {
  description = "Supabase SSL certificate secret name"
  value       = module.supabase_ssl_cert.name
}

# サービスアカウント情報
output "service_account_email" {
  description = "n8n Cloud Run service account email"
  value       = module.n8n_cloud_run.service_account_id.email
}

output "service_account_member" {
  description = "n8n Cloud Run service account member"
  value       = module.n8n_cloud_run.service_account_id.member
}
