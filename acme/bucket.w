bring k8s;

pub struct BucketSpec {
  region: str?;
  public: bool?;
}

pub class Bucket {
  new(spec: BucketSpec) {
    let acl = (() => { if spec.public ?? false { return "public-read"; } else { return "private"; } })();

    new k8s.ApiObject(
      apiVersion: "s3.aws.crossplane.io/v1beta1",
      kind: "Bucket",
      spec: {
        forProvider: {
          locationConstraint: "us-east-1",
          acl,
          serverSideEncryptionConfiguration: {
            rules: [
              {
                applyServerSideEncryptionByDefault: {
                  sseAlgorithm: "AES256",
                },
              },
            ],
          },
          versioningConfiguration: {
            status: "Enabled",
          },
        },
        providerConfigRef: {
          name: "default"
        }
      }
    );
  }
}