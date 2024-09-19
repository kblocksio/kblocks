bring expect;
bring cloud;
bring "./pool.w" as p;
bring "./types.w" as t;
bring "./bucket.w" as b;

let bucket = new b.SimulatedPoolBucket(populate: false);

let pool = new p.Pool(bucket: bucket);

test "starts empty" {
  let x = pool.tryAlloc(provider: t.Provider.aws, region: "us-east-1", size: t.Size.medium);
  expect.nil(x);
}

test "object is deleted after alloc" {
  pool.add(
    t.Host {
      provider: t.Provider.aws,
      instanceId: "i-small-001",
      sshPrivateKey: "<private-key-0>",
      region: "us-east-1",
      size: t.Size.small,
      kubeconfig: "<kubeconfig-0>",
      publicIp: "1.2.3.0",
      registryPassword: "passpass-0",
      instanceType: { size: t.Size.small, name: "t4g.small", dailyCost: 0.2016, monthlyCost: 6.13, vcpu: 2, memory: 2, provider: t.Provider.aws },
      publicDns: "ec2-1-2-3-0.compute-1.amazonaws.com"
    }
  );

  pool.add(
    t.Host {
      provider: t.Provider.aws,
      instanceId: "i-medium-001",
      region: "us-east-1",
      size: t.Size.medium,
      sshPrivateKey: "<private-key-1>",
      kubeconfig: "<kubeconfig-1>",
      publicIp: "1.2.3.99",
      registryPassword: "passpass-99",
      instanceType: { size: t.Size.small, name: "t4g.small", dailyCost: 0.2016, monthlyCost: 6.13, vcpu: 2, memory: 2, provider: t.Provider.aws },
      publicDns: "ec2-1-2-3-99.compute-1.amazonaws.com"
    }
  );

  expect.equal(bucket.list(), ["aws/us-east-1/small/i-small-001", "aws/us-east-1/medium/i-medium-001"]);

  let x = pool.tryAlloc(provider: t.Provider.aws, region: "us-east-1", size: t.Size.small);

  expect.equal(x, {
    instanceId: "i-small-001",
    provider: "aws",
    region: "us-east-1",
    size: "small",
    sshPrivateKey: "<private-key-0>",
    kubeconfig: "<kubeconfig-0>",
    publicIp: "1.2.3.0",
    registryPassword: "passpass-0",
    instanceType: { size: "small", name: "t4g.small", dailyCost: 0.2016, monthlyCost: 6.13, vcpu: 2, memory: 2, provider: "aws" },
    publicDns: "ec2-1-2-3-0.compute-1.amazonaws.com"
  });

  // the object should be deleted from the bucket
  expect.equal(bucket.list(), [
    "aws/us-east-1/medium/i-medium-001"
  ]);

  // cannot allocate another small instance
  let y = pool.tryAlloc(provider: t.Provider.aws, region: "us-east-1", size: t.Size.small);
  expect.nil(y);
}