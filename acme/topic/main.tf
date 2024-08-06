resource "aws_sns_topic" "my_topic" {
  name = var.topicName
}

output "topicArn" {
  value = aws_sns_topic.my_topic.arn
  description = "The ARN of the SNS topic"
}

provider "aws" {
  region = var.region
}
