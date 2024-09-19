bring "cdktf" as cdktf;
bring "@cdktf/provider-aws" as tfaws;
bring aws;
bring cloud;
bring tf;
bring util;

pub struct CustomDomainConfig {
  cname: str;
  zoneName: str;
  certificateArn: str;
  dnsimpleAccountId: str;
}

pub struct CustomDomainProps extends CustomDomainConfig {
  api: cloud.Api;
}

pub class CustomDomain {
  new(props: CustomDomainProps) {
    if let apiGw = aws.Api.from(props.api) {

      let domainName = props.cname + "." + props.zoneName;

      let domain = new tfaws.apiGatewayDomainName.ApiGatewayDomainName(
        domainName: domainName,
        certificateArn: props.certificateArn,
      );

      new tfaws.apiGatewayBasePathMapping.ApiGatewayBasePathMapping(
        apiId: apiGw.restApiId,
        domainName: domain.domainName,
        stageName: apiGw.stageName,
        basePath: "(none)",
      );
    
      new tf.Provider(
        name: "dnsimple",
        version: "1.7.0",
        source: "dnsimple/dnsimple",
        attributes: {
          token: util.env("DNSIMPLE_TOKEN"),
          account: props.dnsimpleAccountId, 
        }
      );

      new tf.Resource(
        terraformResourceType: "dnsimple_zone_record",
        attributes: {
          zone_name: props.zoneName,
          name: props.cname,
          type: "CNAME",
          value: domain.cloudfrontDomainName,
        }
      );
    }
  }
}