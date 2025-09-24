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

output "iap_service_account_member" {
  description = "IAP service account member"
  value       = google_project_service_identity.iap_p4sa.member
}

output "iap_client_id" {
  description = "IAP client ID for generating ID tokens"
  value       = data.google_project.project.number
}

output "project_number" {
  description = "Google Cloud project number"
  value       = data.google_project.project.number
}
