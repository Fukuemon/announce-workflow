################################################################################
# プロジェクト固有設定
################################################################################
variable "app_name" {
  description = "アプリケーション名"
  type        = string
  default     = "announce-workflow"
}

variable "bucket_name" {
  description = "GCSバケット名（プレフィックス）"
  type        = string
  default     = "speaker-images"
}

variable "purpose" {
  description = "バケットの用途"
  type        = string
  default     = "speaker-portrait-storage"
}

variable "tags" {
  description = "リソースに付与するタグ"
  type        = map(string)
  default     = {}
}

################################################################################
# 環境ごとのインスタンス設定（compositionから受け取り）
################################################################################
variable "env" {
  description = "デプロイ環境"
  type        = string
}

variable "project_id" {
  description = "GCPプロジェクトID"
  type        = string
}

variable "location" {
  description = "バケットのロケーション"
  type        = string
  default     = "ASIA-NORTHEAST1"
}

################################################################################
# GCS設定
################################################################################
variable "force_destroy" {
  description = "バケット削除時にオブジェクトを強制削除するか"
  type        = bool
  default     = false
}

variable "uniform_bucket_level_access" {
  description = "バケットレベルアクセス制御を有効にするか"
  type        = bool
  default     = true
}

variable "versioning" {
  description = "バージョニング設定"
  type = object({
    enabled = bool
  })
  default = {
    enabled = true
  }
}

variable "lifecycle_rules" {
  description = "ライフサイクルルール"
  type = set(object({
    action = object({
      type          = string
      storage_class = optional(string)
    })
    condition = object({
      age                        = optional(number)
      send_age_if_zero           = optional(bool)
      created_before             = optional(string)
      with_state                 = optional(string)
      matches_storage_class      = optional(string)
      matches_prefix             = optional(string)
      matches_suffix             = optional(string)
      num_newer_versions         = optional(number)
      custom_time_before         = optional(string)
      days_since_custom_time     = optional(number)
      days_since_noncurrent_time = optional(number)
      noncurrent_time_before     = optional(string)
    })
  }))
  default = [
    {
      action = {
        type = "Delete"
      }
      condition = {
        age = 90
      }
    }
  ]
}

variable "encryption" {
  description = "暗号化設定"
  type = object({
    default_kms_key_name = optional(string)
  })
  default = {}
}

variable "cors" {
  description = "CORS設定"
  type = list(object({
    origin          = optional(list(string))
    method          = optional(list(string))
    response_header = optional(list(string))
    max_age_seconds = optional(number)
  }))
  default = []
}

variable "logging" {
  description = "ログ設定"
  type = object({
    log_bucket        = optional(string)
    log_object_prefix = optional(string)
  })
  default = {}
}



################################################################################
# IAM設定
################################################################################
variable "gcs_viewers" {
  description = "オブジェクト閲覧権限を持つメンバー"
  type        = list(string)
  default     = []
}

variable "gcs_creators" {
  description = "オブジェクト作成権限を持つメンバー"
  type        = list(string)
  default     = []
}

variable "gcs_admins" {
  description = "バケット管理権限を持つメンバー"
  type        = list(string)
  default     = []
}

