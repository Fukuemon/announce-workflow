
locals {
  # 共通タグの定義（GCSバケット用）
  common_tags = merge(var.tags, {
    name        = "${var.app_name}-${var.env}"
    project     = var.project_name
    environment = var.env
    service     = "n8n"
  })

  # n8n用のSecret名
  n8n_secrets = [
    "${var.app_name}-encryption-key-${var.env}",
    "${var.app_name}-db-connection-${var.env}"
  ]

  # Cloud Runサービス名
  service_name = "${var.app_name}-${var.env}"
}
