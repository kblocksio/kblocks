# AwsAccount
A Kubernetes custom resource to create and manage AWS accounts.

## Options
- **email** (required): The email address associated with the AWS account. This must be a valid email string.
- **name** (required): The name of the AWS account. This should be a string representing the desired account name.

## Examples in Kubernetes Manifests
```yaml
apiVersion: acme.com/v1
kind: AwsAccount
metadata:
  name: example-aws-account
spec:
  email: "example@example.com"
  name: "ExampleAccount"
```
```yaml
apiVersion: acme.com/v1
kind: AwsAccount
metadata:
  name: production-aws-account
spec:
  email: "production@example.com"
  name: "ProductionAccount"
```

## Outputs
- **accountId**: The ID of the AWS account.

## Resources
- OrganizationsAccount: An AWS account resource created and managed within AWS Organizations using the specified email and name.

## Behavior
The AwsAccount resource creates an AWS account under an existing AWS Organization using the provided email and name. It outputs the `accountId` of the newly created account, which can be used for further configuration or management within AWS.