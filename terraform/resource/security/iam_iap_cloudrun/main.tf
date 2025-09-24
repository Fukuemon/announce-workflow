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

locals {
  # IAPサービスアカウントのメンバー形式
  iap_service_account_member = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-iap.iam.gserviceaccount.com"
}

# プロジェクト情報の取得
data "google_project" "project" {
  project_id = var.project_id
}

# IAPサービスアカウントの作成
resource "google_project_service_identity" "iap_p4sa" {
  provider = google-beta
  project  = var.project_id
  service  = "iap.googleapis.com"
}

# Cloud Runサービスに対するIAPサービスアカウントのinvoker権限
resource "google_cloud_run_v2_service_iam_member" "iap_invoker" {
  count    = var.enable_iap ? 1 : 0
  location = var.cloud_run_location
  project  = var.project_id
  name     = var.cloud_run_service_name
  role     = "roles/run.invoker"
  member   = google_project_service_identity.iap_p4sa.member
}

# IAPアクセス権限の付与（ユーザー・グループ・サービスアカウント）
resource "google_iap_web_cloud_run_service_iam_member" "iap_access" {
  for_each               = var.enable_iap ? toset(var.iap_members) : []
  project                = var.project_id
  location               = var.cloud_run_location
  cloud_run_service_name = var.cloud_run_service_name
  role                   = "roles/iap.httpsResourceAccessor"
  member                 = each.value
}

# Secret Managerアクセス権限の付与（Cloud Runサービスアカウント用）
resource "google_secret_manager_secret_iam_member" "secret_accessor" {
  count     = var.enable_iap ? length(var.secret_names) : 0
  project   = var.project_id
  secret_id = var.secret_names[count.index]
  role      = "roles/secretmanager.secretAccessor"
  member    = var.cloud_run_service_account_member
}
