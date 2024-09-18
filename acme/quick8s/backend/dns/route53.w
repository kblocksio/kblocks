bring "./api.w" as api;
bring aws;

pub struct Route53Props {
  hostedZoneId: str;
  domainName: str;
}

pub class Route53 impl api.IDns, std.IHostedLiftable {
  hostedZoneId: str;
  domainName: str;

  new(props: Route53Props) {
    this.hostedZoneId = props.hostedZoneId;
    this.domainName = props.domainName;
  }

  pub inflight addARecord(name: str, ip: str): void {
    Route53._addARecord(this.hostedZoneId, this.domainName, name, ip);
  }

  pub inflight removeARecord(name: str, ip: str): void {
    Route53._removeARecord(this.hostedZoneId, this.domainName, name, ip);
  }

  extern "./route53.ts" static inflight _addARecord(hostedZoneId: str, domainName: str, name: str, ip: str): void;
  extern "./route53.ts" static inflight _removeARecord(hostedZoneId: str, domainName: str, name: str, ip: str): void;

  pub onLift(host: std.IInflightHost, ops: Array<str>) {
    if let fn = aws.Function.from(host) {
      fn.addPolicyStatements(
        {
          effect: aws.Effect.ALLOW,
          actions: ["route53:ChangeResourceRecordSets"],
          resources: ["arn:aws:route53:::hostedzone/{this.hostedZoneId}"]
        }
      );
    }
  }
}
