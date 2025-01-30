# This is an example of an AWS SNS topic resource which will be created by the block
resource "aws_sns_topic" "my_topic" {
  name = var.myValue
}

# This is an example of an output value that will be returned by the block
output "myOutput" {
  value       = aws_sns_topic.my_topic.arn
  description = "An output value for my block"
}
