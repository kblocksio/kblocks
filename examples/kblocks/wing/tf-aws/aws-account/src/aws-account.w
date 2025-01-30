bring "cdktf" as cdktf;
bring "@cdktf/provider-aws" as aws;

pub struct AwsAccountSpec {
  name: str;
  email: str;
}

pub class AwsAccount {
  pub accountId: str;

  new(spec: AwsAccountSpec) {
    let account = new aws.organizationsAccount.OrganizationsAccount(
      name: spec.name,
      email: spec.email,
      closeOnDeletion: true,
    );
    this.accountId = account.id;
    new cdktf.TerraformOutput(value: account.id, staticId: true) as "accountId";
  }
}
