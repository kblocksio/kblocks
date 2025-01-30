bring cloud;
bring aws;
bring "cdktf" as cdktf;

pub struct QueueSpec {
  ///
  /// When a consumer receives a message from an Amazon SQS queue, the message remains in the queue
  /// but becomes temporarily invisible to other consumers. This temporary invisibility is controlled
  /// by the visibility timeout, a mechanism that prevents other consumers from processing the same
  /// message while it is being worked on. Amazon SQS does not automatically delete the message;
  /// instead, the consumer must explicitly delete the message using the DeleteMessage action after
  /// it has been successfully processed.
  ///
  /// Read more in the [AWS SQS Developer Guide](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html).
  ///
  /// @default 60 seconds
  ///
  timeoutSec: num?;

  ///
  /// Amazon SQS automatically deletes messages that have been in a queue for more than the maximum message retention period. 
  /// The default message retention period is 4 days. However, you can set the message retention period to a value from 1 minute to 20,160 minutes (14 days).
  ///
  /// @default 14 days
  ///
  retentionMin: num?;
}

pub class Queue {
  new(spec: QueueSpec) {
    let queue = new cloud.Queue(
      timeout: duration.fromSeconds(spec.timeoutSec ?? 60),
      retentionPeriod: duration.fromMinutes(spec.retentionMin ?? (14 * 24 * 60)),
    );
    
    let queueUrl = aws.Queue.from(queue)?.queueArn!;

    let regionDataSource = new cdktf.TerraformDataSource(
      terraformResourceType: "aws_region",
    );

    let region = regionDataSource.getStringAttribute("name");

    let awsConsoleUrl = "https://{region}.console.aws.amazon.com/sqs/v3/home?region={region}#/queues/{queueUrl}";

    new cdktf.TerraformOutput(value: queueUrl, staticId: true) as "queueUrl";
    new cdktf.TerraformOutput(value: awsConsoleUrl, staticId: true) as "awsConsole";
  }
}
