bring cloud;
bring aws;
bring fs;
bring "./types.w" as t;

// TODO: structural interfaces + cloud.IBucket would have made my life so much easier

pub interface IBucket {
  inflight list(prefix: str): Array<str>;
  inflight getJson(key: str): Json;
  inflight delete(key: str): void;
  inflight putJson(key: str, json: Json): void;
}

pub struct SimulatedPoolBucketProps {
  /// Whether the pool should be populated.
  /// @default true
  populate: bool?;
}

pub class SimulatedPoolBucket impl IBucket {
  b: cloud.Bucket;
  
  new(props: SimulatedPoolBucketProps) {
    this.b = new cloud.Bucket();

    if props.populate ?? true {
      this.populate();
    }
  }

  pub inflight delete(key: str): void { this.b.delete(key); }
  pub inflight putJson(key: str, json: Json): void { this.b.putJson(key, json); }
  pub inflight list(prefix: str?): Array<str> { return this.b.list(prefix); }
  pub inflight getJson(key: str): Json { return this.b.getJson(key); }

  populate() {
    let fixture = fs.readJson("{@dirname}/fixtures/host.json");
    let kubeconfigBase64 = fixture.get("kubeconfig").asStr();

    let var i = 0;

    let addHost = (provider: t.Provider, region: str, size: t.Size) => {
      let instanceId = "i-{i}";
      let key = "{provider}/{region}/{size}/{instanceId}";
      this.b.addObject(key, Json.stringify(t.Host {
        provider: provider,
        region: region,
        instanceType: t.Defaults.instanceTypes()[0],
        size: size,
        publicDns: "ec2-1-2-3-{i}.compute-1.amazonaws.com",
        sshPrivateKey: "<private-key-{i}>",
        instanceId: instanceId,
        kubeconfig: kubeconfigBase64,
        registryPassword: "<password-{i}>",
        publicIp: "1.2.3.{i}",
      }));

      i += 1;
    };

    // 1 small, 2 medium, 1 large, 0 xlarge
    addHost(t.Provider.aws, "us-east-1", t.Size.small);   // 0
    addHost(t.Provider.gcp, "america", t.Size.small);     // 1
    addHost(t.Provider.aws, "us-east-1", t.Size.medium);  // 2  
    addHost(t.Provider.aws, "us-east-1", t.Size.medium);  // 3
    addHost(t.Provider.aws, "us-east-1", t.Size.large);   // 4
  }
}

pub class AwsBucketRef impl IBucket {
  b: aws.BucketRef;

  new(bucketName: str) {
    this.b = new aws.BucketRef(bucketName);
  }

  pub inflight list(prefix: str?): Array<str> { return this.b.list(prefix); }
  pub inflight getJson(key: str): Json { return this.b.getJson(key); }
  pub inflight delete(key: str): void { this.b.delete(key); }
  pub inflight putJson(key: str, json: Json): void { this.b.putJson(key, json); }
}
