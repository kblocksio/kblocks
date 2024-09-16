bring "cdktf" as cdktf;
bring "@cdktf/provider-aws" as aws;
bring "@cdktf/provider-null" as tfnull;
bring "@cdktf/provider-local" as local;
bring fs;
bring tf;
bring util;

pub struct Q8sClusterSpec {

}

pub class Q8sCluster {
  new(props: Q8sClusterSpec) {

    new tfnull.provider.NullProvider();
    new local.provider.LocalProvider();

    let id = nodeof(this).id;

    let securityGroup = new aws.securityGroup.SecurityGroup(
      description: "quick8s security group",

      // allow all egress
      egress: [{
        fromPort: 0,
        toPort: 0,
        protocol: "-1",
        cidrBlocks: ["0.0.0.0/0"],
      }],

      ingress: [{
        fromPort: 0,
        toPort: 65535,
        protocol: "tcp",
        cidrBlocks: ["0.0.0.0/0"],
      }],
    );

    let userData = fs.readFile("{@dirname}/setup/userdata.sh");
    let userDataBase64 = util.base64Encode(userData);

    let sshKey = new TlsPrivateKey();

    let keypair = new aws.keyPair.KeyPair(
      publicKey: sshKey.publicKeyOpenSsh,
    );

    let instance = new aws.instance.Instance(
      ami: "ami-09a87715cee8d3868",
      instanceType: "t4g.2xlarge",
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
      connection: {
        type: "ssh",
        host: "self.publicDns",
        user: "ec2-user",
        privateKey: sshKey.privateKeyPem,
      },
      lifecycle: {
        ignoreChanges: ["ami"],
      },
    );

    let userDataCompletion = new tfnull.resource.Resource(
      dependsOn: [instance],
      connection: {
        type: "ssh",
        host: instance.publicDns,
        user: "ec2-user",
        privateKey: sshKey.privateKeyPem,
      },
      provisioners: [
        {
          type: "remote-exec",
          inline: [
            "sudo cloud-init status --wait", // Wait for cloud-init to complete
            "echo 'User data script has completed'",
          ]
        },
      ]
    ) as "userDataCompletion";

    let workdir = fs.mkdtemp();
    let configPath = "{workdir}/kubeconfig";
    let keyPath = "{workdir}/key.pem";

    let downloadKubeconfig = new tfnull.resource.Resource(
      dependsOn: [userDataCompletion],
      connection: {
        type: "ssh",
        host: instance.publicDns,
        user: "ec2-user",
        privateKey: sshKey.privateKeyPem,
      },
      provisioners: [
        {
          type: "local-exec",
          command: [
            "echo '$\{sensitive({sshKey.privateKeyPem})}' > {keyPath}",
            "chmod 600 {keyPath}",
            "ssh -o StrictHostKeyChecking=no -i {keyPath} ec2-user@{instance.publicDns} 'kind export kubeconfig && cat ~/.kube/config' > {configPath}",
            "rm {keyPath}",
          ].join("\n")
        },
      ]
    ) as "downloadKubeconfig";


    let kubeConfig = new local.dataLocalFile.DataLocalFile(
      filename: configPath,
      dependsOn: [downloadKubeconfig],
    ) as "kubeconfigFile";

    new cdktf.TerraformOutput(value: instance.publicDns, staticId: true) as "host";
    new cdktf.TerraformOutput(value: kubeConfig.getStringAttribute("content"), staticId: true) as "kubeconfig";
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