resource "aws_sns_topic" "my_topic" {
  name = var.topicName
  kms_master_key_id = var.encrypted ? "alias/aws/sns" : null
}

output "topicArn" {
  value = aws_sns_topic.my_topic.arn
  description = "The ARN (Amazon Resource Name) of the SNS topic"
}

data "aws_region" "current" {}

output "awsConsole" {
  value       = "https://${data.aws_region.current.name}.console.aws.amazon.com/sns/v3/home?region=${data.aws_region.current.name}#/topic/${aws_sns_topic.my_topic.name}"
  description = "The URL to the AWS console for this topic"
}

provider "aws" {
  region = var.region
}
