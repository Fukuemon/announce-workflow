################################################################################
# 環境設定
################################################################################
variable "env" {
  description = "デプロイ環境"
  type        = string
  default     = "local"
}

variable "project_id" {
  description = "GCPのプロジェクトID"
  type        = string
}

variable "location" {
  description = "GCPのロケーション"
  type        = string
  default     = "ASIA-NORTHEAST1"
}

################################################################################
# GCS設定
################################################################################
variable "force_destroy" {
  description = "バケット削除時にオブジェクトを強制削除するか"
  type        = bool
  default     = true # ローカル環境では強制削除を許可
}

################################################################################
# IAM設定
################################################################################
variable "gcs_viewers" {
  description = "GCSオブジェクト閲覧権限を持つメンバー"
  type        = list(string)
  default     = []
}

variable "gcs_creators" {
  description = "GCSオブジェクト作成権限を持つメンバー"
  type        = list(string)
  default     = []
}

variable "gcs_admins" {
  description = "GCSバケット管理権限を持つメンバー"
  type        = list(string)
  default     = []
}
