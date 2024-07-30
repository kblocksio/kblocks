bring cloud;
bring aws;
bring "cdktf" as tf;

pub struct QueueSpec {
  timeoutSec: num?;
}

pub class Queue {
  new(spec: QueueSpec) {
    let queue = new cloud.Queue(timeout: duration.fromSeconds(spec.timeoutSec ?? 60));

    queue.setConsumer(inflight (msg) => {
      log("new message: {msg}");
    });

    let queueUrl = aws.Queue.from(queue)?.queueArn;
    new tf.TerraformOutput(value: queueUrl, staticId: true) as "queueUrl";
  }
}
