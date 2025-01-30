import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const config = new pulumi.Config();
const name = config.require("bucket");

// Create an AWS resource (S3 Bucket)
const bucket = new aws.s3.BucketV2(name);

// Export the name of the bucket
export const bucketName = bucket.id;
