bring "cdktf" as cdktf;
bring "@cdktf/provider-aws" as aws;
bring "@cdktf/provider-null" as tfnull;
bring "@cdktf/provider-local" as local;
bring fs;
bring tf;
bring util;
bring "./backend/types.w" as t;

pub struct Q8sClusterSpec {
  size: t.Size;
}

class Providers {
 new() {
    new tfnull.provider.NullProvider();
    new local.provider.LocalProvider();
 }
}

pub class Q8sCluster {
  new(spec: Q8sClusterSpec) {
    this.installProviders();

    let poolBucketName = util.env("QUICK8S_POOL_BUCKET");
    
    let id = nodeof(this).id;
    let workdir = fs.mkdtemp();
    let configPath = "{workdir}/kubeconfig";
    let keyPath = "{workdir}/key.pem";

    let instanceType = this.findInstanceType(spec.size);

    let securityGroup = new aws.securityGroup.SecurityGroup(
      description: "quick8s security group",

      // allow all egress
      egress: [{
        fromPort: 0,
        toPort: 0,
        protocol: "-1",
        cidrBlocks: ["0.0.0.0/0"],
      }],

      // allow all ingress
      ingress: [{
        fromPort: 0,
        toPort: 65535,
        protocol: "tcp",
        cidrBlocks: ["0.0.0.0/0"],
      }],
    );

    let userData = fs.readFile("{@dirname}/setup/userdata.sh");
    let userDataBase64 = util.base64Encode(userData);
    let user = "ec2-user";

    // generate an ssh key for our host
    let sshKey = new TlsPrivateKey();

    let keypair = new aws.keyPair.KeyPair(
      publicKey: sshKey.publicKeyOpenSsh,
    );

    let instance = new aws.instance.Instance(
      ami: "ami-06e4cdf7c9ff067ca",
      instanceType: instanceType.name,
      keyName: keypair.keyName,
      vpcSecurityGroupIds: [securityGroup.id],
      associatePublicIpAddress: true,
      monitoring: false,
      ebsOptimized: true,
      tags: {
        Name: "quick8s/{id}",
      },
      userDataBase64: userDataBase64,
      userDataReplaceOnChange: true,
      rootBlockDevice: {
        volumeSize: 8,
        deleteOnTermination: true,
        volumeType: "gp2",
      },
      metadataOptions: {
        httpEndpoint: "enabled",
        httpTokens: "required",
        httpPutResponseHopLimit: 2,
        httpProtocolIpv6: "disabled",
      },
      lifecycle: {
        ignoreChanges: ["ami"],
      },
    );

    let connection = {
      type: "ssh",
      host: instance.publicDns,
      user,
      privateKey: sshKey.privateKeyPem,
    };

    let waitCommand = [
      #"sudo cloud-init status --wait || { cat /var/log/cloud-init-output.log; exit 1; }",
      "echo 'User data script has completed successfully'",
    ];

    // wait for the userdata script to finish
    let userDataCompletion = new tfnull.resource.Resource(
      dependsOn: [instance],
      connection: connection,
      triggers: {
        command: util.sha256(waitCommand.join("\n")),
      },
      provisioners: [
        {
          type: "remote-exec",
          inline: waitCommand,
        },
      ]
    ) as "userDataCompletion";

    let command = [
      "set -euo pipefail",
      "echo '$\{sensitive({sshKey.privateKeyPem})}' > {keyPath}",
      "chmod 600 {keyPath}",
      "ssh -o StrictHostKeyChecking=no -i {keyPath} {user}@{instance.publicDns} 'kind export kubeconfig && cat ~/.kube/config' > {configPath}",
      "rm {keyPath}",
    ].join("\n");
    
    let downloadKubeconfig = new tfnull.resource.Resource(
      dependsOn: [userDataCompletion],
      connection: connection,
      triggers: {
        command: util.sha256(command),
      },
      provisioners: [
        {
          type: "local-exec",
          command,
        },
      ]
    ) as "DownloadKubeconfig";

    fs.writeFile(configPath, "<dummmy>");

    let kubeConfig = new local.dataLocalFile.DataLocalFile(
      filename: configPath,
      dependsOn: [downloadKubeconfig],
    ) as "kubeconfigFile";

    let region = new aws.dataAwsRegion.DataAwsRegion();

    let hostJson = t.Host {
      instanceId: instance.id,
      publicIp: instance.publicIp,
      sshPrivateKey: cdktf.Fn.base64encode(sshKey.privateKeyPem),
      region: region.name,
      provider: t.Provider.aws,
      size: instanceType.size,
      kubeconfig: cdktf.Fn.base64encode(kubeConfig.getStringAttribute("content")),
      registryPassword: "<TBD>",
      instanceType: instanceType,
    };

    new aws.s3Object.S3Object(
      bucket: poolBucketName,
      key: "{instanceType.provider}/{region.name}/{instanceType.size}/{instance.id}",
      content: Json.stringify(hostJson),
      contentType: "application/json",
    );

    new cdktf.TerraformOutput(value: instance.publicDns, staticId: true) as "host";
    new cdktf.TerraformOutput(value: kubeConfig.getStringAttribute("content"), staticId: true, sensitive: true) as "kubeconfig";
    new cdktf.TerraformOutput(value: sshKey.privateKeyPem, staticId: true, sensitive: true) as "pem";
  }

  findInstanceType(size: t.Size): t.InstanceType {
    let types: Array<t.InstanceType> = [
      { size: t.Size.small, name: "t4g.small", dailyCost: 0.2016, monthlyCost: 6.13, vcpu: 2, memory: 2, provider: t.Provider.aws   },
      { size: t.Size.medium, name: "t4g.medium", dailyCost: 0.4032, monthlyCost: 12.26, vcpu: 2, memory: 4, provider: t.Provider.aws },
      { size: t.Size.large, name: "t4g.xlarge", dailyCost: 1.6128, monthlyCost: 49.06, vcpu: 4, memory: 16, provider: t.Provider.aws },
      { size: t.Size.xlarge, name: "t4g.2xlarge", dailyCost: 3.2256, monthlyCost: 98.11, vcpu: 8, memory: 32, provider: t.Provider.aws },
    ];

    // lookup the instance type based on the size
    for type in types {
      if (type.size == size) {
        return type;
      }
    }
  
    throw "Invalid size: {size}";
  }

  installProviders() {
    let root = nodeof(this).root;
    if nodeof(root).tryFindChild("providers") == nil {
      new Providers() as "providers" in root;
    }
  }
}


class TlsPrivateKey {
  pub publicKeyOpenSsh: str;
  pub privateKeyPem: str;

  new() {
    let r = new tf.Resource(
      terraformResourceType: "tls_private_key",
      attributes: {
        algorithm: "RSA",
        rsa_bits: 4096,
      }
    );

    this.publicKeyOpenSsh = r.getStringAttribute("public_key_openssh");
    this.privateKeyPem = r.getStringAttribute("private_key_pem");
  }
}