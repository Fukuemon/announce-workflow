
################################################################################
# ローカル値
################################################################################
locals {
  bucket_base_name = "${var.app_name}-${var.bucket_name}-${var.env}-${var.project_id}"
  bucket_name      = lower(replace(local.bucket_base_name, "_", "-"))

  # 共通ラベル
  common_labels = merge({
    project     = var.app_name,
    environment = var.env,
    service     = var.purpose,
  }, var.tags)

  bucket_labels = merge(local.common_labels, {
    name = local.bucket_name
  })
}

