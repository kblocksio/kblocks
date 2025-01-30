variable "region" {
  description = "AWS region for the CloudFront distribution"
  type        = string
  default     = "us-east-1"  # CloudFront requires ACM certificates in us-east-1
}

variable "bucketDomainName" {
  description = "Domain name of the S3 bucket to be used as the origin"
  type        = string
}

variable "bucketName" {
  description = "Name (ID) of the S3 bucket"
  type        = string
}

variable "bucketArn" {
  description = "ARN of the S3 bucket"
  type        = string
}
