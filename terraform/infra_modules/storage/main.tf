###############################################################################
# GCS バケット（公式 simple_bucket モジュールの薄いラッパー）
###############################################################################

module "gcs_bucket" {
  source = "../../resource/storage/gcs/simple_bucket"

  # 単一バケット運用を前提に、公式 simple_bucket の I/O に合わせて値を渡す
  project_id = var.project_id
  location   = var.location
  name       = local.bucket_name

  # セキュリティ/運用
  force_destroy            = var.force_destroy
  bucket_policy_only       = var.uniform_bucket_level_access
  versioning               = var.versioning.enabled
  public_access_prevention = "inherited"

  # ラベル
  labels = local.bucket_labels

  # 暗号化
  encryption = (
    try(var.encryption.default_kms_key_name, null) != null
    ) ? {
    default_kms_key_name = var.encryption.default_kms_key_name
  } : null

  # CORS / Lifecycle / Logging
  cors              = var.cors
  lifecycle_rules   = tolist(var.lifecycle_rules)
  log_bucket        = try(var.logging.log_bucket, null)
  log_object_prefix = try(var.logging.log_object_prefix, null)

  # IAM（simple_bucket は iam_members を受けるため、rolesに変換）
  iam_members = concat(
    [for m in var.gcs_viewers : { role = "roles/storage.objectViewer", member = m }],
    [for m in var.gcs_creators : { role = "roles/storage.objectCreator", member = m }],
    [for m in var.gcs_admins : { role = "roles/storage.admin", member = m }]
  )
}


