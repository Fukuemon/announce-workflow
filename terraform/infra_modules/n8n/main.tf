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


# n8n暗号鍵のSecret Manager
module "n8n_encryption_key" {
  source = "../../resource/security/secret-manager/simple-secret"

  project_id  = var.project_id
  name        = "${var.app_name}-encryption-key-${var.env}"
  secret_data = var.n8n_encryption_key
  labels      = local.common_tags

  depends_on = [var.api_dependencies]
}

# n8n DB接続情報のSecret Manager（個別）
module "n8n_db_host" {
  source = "../../resource/security/secret-manager/simple-secret"

  project_id  = var.project_id
  name        = "${var.app_name}-db-host-${var.env}"
  secret_data = var.n8n_db_host
  labels      = local.common_tags

  depends_on = [var.api_dependencies]
}

module "n8n_db_port" {
  source = "../../resource/security/secret-manager/simple-secret"

  project_id  = var.project_id
  name        = "${var.app_name}-db-port-${var.env}"
  secret_data = var.n8n_db_port
  labels      = local.common_tags

  depends_on = [var.api_dependencies]
}

module "n8n_db_database" {
  source = "../../resource/security/secret-manager/simple-secret"

  project_id  = var.project_id
  name        = "${var.app_name}-db-database-${var.env}"
  secret_data = var.n8n_db_database
  labels      = local.common_tags

  depends_on = [var.api_dependencies]
}

module "n8n_db_user" {
  source = "../../resource/security/secret-manager/simple-secret"

  project_id  = var.project_id
  name        = "${var.app_name}-db-user-${var.env}"
  secret_data = var.n8n_db_user
  labels      = local.common_tags

  depends_on = [var.api_dependencies]
}

module "n8n_db_password" {
  source = "../../resource/security/secret-manager/simple-secret"

  project_id  = var.project_id
  name        = "${var.app_name}-db-password-${var.env}"
  secret_data = var.n8n_db_password
  labels      = local.common_tags

  depends_on = [var.api_dependencies]
}

# Supabase SSL証明書のSecret Manager
module "supabase_ssl_cert" {
  source = "../../resource/security/secret-manager/simple-secret"

  project_id  = var.project_id
  name        = "${var.app_name}-supabase-ssl-cert-${var.env}"
  secret_data = var.supabase_ssl_cert
  labels      = local.common_tags

  depends_on = [var.api_dependencies]
}

# n8n Basic認証パスワードのSecret Manager
module "n8n_basic_auth_password" {
  source = "../../resource/security/secret-manager/simple-secret"

  project_id  = var.project_id
  name        = "${var.app_name}-basic-auth-password-${var.env}"
  secret_data = var.n8n_basic_auth_password
  labels      = local.common_tags

  depends_on = [var.api_dependencies]
}

# n8n Cloud Runサービス
module "n8n_cloud_run" {
  source = "../../resource/compute/cloud_run/v2"

  project_id   = var.project_id
  location     = var.region
  service_name = local.service_name
  description  = "n8n workflow automation service for ${var.env} environment"

  # n8nコンテナ設定
  containers = [{
    container_name  = "n8n"
    container_image = var.n8n_image
    ports = {
      name           = "http1"
      container_port = 5678
    }
    env_vars = {
      N8N_PROTOCOL          = "https"
      N8N_SECURE_COOKIE     = "true"
      N8N_PORT              = 5678
      N8N_HOST              = ""                                                   # Cloud Runのホスト名は自動設定
      WEBHOOK_URL           = var.n8n_webhook_url != "" ? var.n8n_webhook_url : "" # Cloud RunのURL（後で動的に設定）
      N8N_LOG_LEVEL         = "info"
      N8N_LOG_OUTPUT        = "console"
      DB_TYPE               = "postgresdb"
      N8N_BASIC_AUTH_ACTIVE = "true"
      N8N_BASIC_AUTH_USER   = "admin"
    }
    env_secret_vars = {
      N8N_ENCRYPTION_KEY = {
        secret  = module.n8n_encryption_key.name
        version = "latest"
      }
      DB_POSTGRESDB_HOST = {
        secret  = module.n8n_db_host.name
        version = "latest"
      }
      DB_POSTGRESDB_PORT = {
        secret  = module.n8n_db_port.name
        version = "latest"
      }
      DB_POSTGRESDB_DATABASE = {
        secret  = module.n8n_db_database.name
        version = "latest"
      }
      DB_POSTGRESDB_USER = {
        secret  = module.n8n_db_user.name
        version = "latest"
      }
      DB_POSTGRESDB_PASSWORD = {
        secret  = module.n8n_db_password.name
        version = "latest"
      }
      N8N_BASIC_AUTH_PASSWORD = {
        secret  = module.n8n_basic_auth_password.name
        version = "latest"
      }
    }
    volume_mounts = [
      {
        name       = "supabase-ssl-cert"
        mount_path = "/etc/ssl/certs"
      }
    ]
    resources = {
      limits = {
        cpu    = var.cpu_limit
        memory = var.memory_limit
      }
      cpu_idle          = false
      startup_cpu_boost = true
    }
  }]

  # IAP設定
  iap_members       = var.iap_members
  enable_iap        = length(var.iap_members) > 0
  support_email     = var.support_email
  application_title = var.application_title

  # スケーリング設定
  template_scaling = {
    min_instance_count = var.min_instances
    max_instance_count = var.max_instances
  }

  # タイムアウト設定
  timeout = var.timeout

  # サービスラベル
  service_labels = local.common_tags

  # サービスアカウント設定
  create_service_account = var.create_service_account
  service_account        = var.existing_service_account_email
  service_account_project_roles = var.create_service_account ? [
    "roles/secretmanager.secretAccessor"
  ] : []
  deletion_protection = false

  # ボリューム設定
  volumes = [
    {
      name = "supabase-ssl-cert"
      secret = {
        secret = module.supabase_ssl_cert.name
        items = {
          path    = "supabase-ca.crt"
          version = "latest"
          mode    = "0400"
        }
      }
    }
  ]

  depends_on = [
    module.n8n_encryption_key,
    module.n8n_db_host,
    module.n8n_db_port,
    module.n8n_db_database,
    module.n8n_db_user,
    module.n8n_db_password,
    module.supabase_ssl_cert,
    module.n8n_basic_auth_password
  ]
}

# Cloud Run作成後にWEBHOOK_URLを動的に設定
resource "null_resource" "update_webhook_url" {
  count = var.n8n_webhook_url == "" ? 1 : 0

  provisioner "local-exec" {
    command = <<-EOT
      gcloud run services update ${local.service_name} \
        --region=${var.region} \
        --project=${var.project_id} \
        --set-env-vars="WEBHOOK_URL=${module.n8n_cloud_run.service_uri}"
    EOT
  }

  depends_on = [module.n8n_cloud_run]
}

# IAP認証とIAM設定
module "n8n_iap" {
  source = "../../resource/security/iam_iap_cloudrun"

  project_id             = var.project_id
  enable_iap             = length(var.iap_members) > 0
  cloud_run_location     = var.region
  cloud_run_service_name = local.service_name
  iap_members            = var.iap_members
  secret_names = [
    module.n8n_encryption_key.name,
    module.n8n_db_host.name,
    module.n8n_db_port.name,
    module.n8n_db_database.name,
    module.n8n_db_user.name,
    module.n8n_db_password.name,
    module.supabase_ssl_cert.name,
    module.n8n_basic_auth_password.name
  ]
  cloud_run_service_account_member = module.n8n_cloud_run.service_account_id.member

  depends_on = [module.n8n_cloud_run]
}

# 既存のサービスアカウントにSecret Managerアクセス権限を付与
resource "google_secret_manager_secret_iam_member" "existing_sa_secret_accessor" {
  count   = var.existing_service_account_email != null ? 8 : 0
  project = var.project_id
  secret_id = [
    module.n8n_encryption_key.name,
    module.n8n_db_host.name,
    module.n8n_db_port.name,
    module.n8n_db_database.name,
    module.n8n_db_user.name,
    module.n8n_db_password.name,
    module.supabase_ssl_cert.name,
    module.n8n_basic_auth_password.name
  ][count.index]
  role   = "roles/secretmanager.secretAccessor"
  member = "serviceAccount:${var.existing_service_account_email}"
}
