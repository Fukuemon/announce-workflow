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

variable "project_id" {
  description = "The project ID to deploy to"
  type        = string
}

variable "enable_iap" {
  description = "Enable IAP authentication for Cloud Run service"
  type        = bool
  default     = true
}

variable "cloud_run_location" {
  description = "Cloud Run service location"
  type        = string
}

variable "cloud_run_service_name" {
  description = "Cloud Run service name"
  type        = string
}

variable "iap_members" {
  description = "List of members (users, groups, service accounts) to grant IAP access"
  type        = list(string)
  default     = []
}

variable "secret_names" {
  description = "List of Secret Manager secret names that Cloud Run service account needs access to"
  type        = list(string)
  default     = []
}

variable "cloud_run_service_account_member" {
  description = "Cloud Run service account member (e.g., serviceAccount:xxx@project.iam.gserviceaccount.com)"
  type        = string
  default     = null
}
