# What are engines?

Kblocks supports multiple provisioning engines for implementing block controllers:

- [**Helm**](/docs/reference/supported-engines/helm): Use Helm charts to template Kubernetes resources
- [**Terraform**](/docs/reference/supported-engines/terraform): Provision cloud resources using Terraform
- [**OpenTofu**](/docs/reference/supported-engines/tofu): Use OpenTofu for cloud infrastructure
- [**Wing**](/docs/reference/supported-engines/wing): Write type-safe infrastructure code
- [**Pulumi**](/docs/reference/supported-engines/pulumi): Use Pulumi for cloud infrastructure
- [**Custom**](/docs/reference/supported-engines/custom): Implement custom logic in any language
- [**No-op**](/docs/reference/supported-engines/noop): Only defines a CRD without provisioning logic

Select a block type from the sidebar to learn more about its specific implementation details. 