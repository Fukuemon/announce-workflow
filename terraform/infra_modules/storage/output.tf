output "bucket_name" {
  description = "作成されたGCSバケット名"
  value       = module.gcs_bucket.name
}

output "bucket_url" {
  description = "GCSバケットのURL"
  value       = module.gcs_bucket.url
}

output "bucket_location" {
  description = "GCSバケットのロケーション"
  value       = module.gcs_bucket.bucket.location
}

output "bucket_storage_class" {
  description = "GCSバケットのストレージクラス"
  value       = module.gcs_bucket.bucket.storage_class
}

