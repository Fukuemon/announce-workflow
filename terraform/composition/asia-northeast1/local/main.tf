
###############################################################################
# Storage Infra Module 呼び出し
###############################################################################

module "storage" {
  source = "../../../infra_modules/storage"

  # 環境
  env        = var.env
  project_id = var.project_id
  location   = var.location

  # 共通タグ
  tags = local.tags

  # GCS 設定
  force_destroy = var.force_destroy

  # IAM 設定
  gcs_viewers  = var.gcs_viewers
  gcs_creators = var.gcs_creators
  gcs_admins   = var.gcs_admins
}

