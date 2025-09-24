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


###############################################################################
# Storage Infra Module 呼び出し
###############################################################################

module "storage" {
  source = "../../../infra_modules/storage"

  # 環境
  env        = var.env
  project_id = var.project_id
  location   = var.region

  # 共通タグ
  tags = local.tags

  # GCS 設定
  force_destroy = var.force_destroy

  # IAM 設定
  gcs_viewers  = var.gcs_viewers
  gcs_creators = var.gcs_creators
  gcs_admins   = var.gcs_admins
}

###############################################################################
# n8n Infra Module 呼び出し
###############################################################################

module "n8n" {
  source = "../../../infra_modules/n8n"

  # プロジェクト設定
  project_id   = var.project_id
  project_name = "announce-workflow"
  region       = var.region

  # アプリケーション設定
  app_name = "n8n"
  env      = var.env

  # n8n設定
  n8n_image               = var.n8n_image
  n8n_encryption_key      = var.n8n_encryption_key
  n8n_db_host             = var.n8n_db_host
  n8n_db_port             = var.n8n_db_port
  n8n_db_database         = var.n8n_db_database
  n8n_db_user             = var.n8n_db_user
  n8n_db_password         = var.n8n_db_password
  supabase_ssl_cert       = var.supabase_ssl_cert
  n8n_basic_auth_password = var.n8n_basic_auth_password

  # Cloud Run設定
  cpu_limit     = var.cpu_limit
  memory_limit  = var.memory_limit
  min_instances = var.min_instances
  max_instances = var.max_instances
  timeout       = var.timeout

  # IAP設定
  iap_members        = var.iap_members
  support_email      = var.support_email
  application_title  = var.application_title

  # サービスアカウント設定
  existing_service_account_email = var.existing_service_account_email
  create_service_account         = var.create_service_account

  # 共通タグ
  tags = local.tags

  # API依存関係
  api_dependencies = [google_project_service.required_apis]

  depends_on = [module.storage]
}
