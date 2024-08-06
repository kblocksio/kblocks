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
