variable "topicName" {
  description = "The name of the topic"
  type        = string
}

variable "region" {
  description = "Which AWS region to deploy in"
  type        = string
  default     = null
  nullable    = true
}

variable "encrypted" {
  description = "Whether the SNS topic should be encrypted. Defaults to false."
  type        = bool
  default     = false
}
