
output "gcs_bucket_name" {
  description = "作成されたGCSバケット名"
  value       = module.storage.bucket_name
}

output "gcs_bucket_url" {
  description = "GCSバケットのURL"
  value       = module.storage.bucket_url
}

output "gcs_bucket_location" {
  description = "GCSバケットのロケーション"
  value       = module.storage.bucket_location
}

