export interface Engine {
  id: string;
  description: string;
}

export const ENGINES: Record<string, Engine> = {
  helm:            { id: "helm",           description: "Block is implemented through a Helm chart." },
  "wing/k8s":      { id: "wing/k8s",       description: "Block is implemented through a Wing Kubernetes program." },
  "wing/tf-aws":   { id: "wing/tf-aws",    description: "Block is implemented through a Wing Terraform AWS program." },
  "wing/tf-azure": { id: "wing/tf-azure",  description: "Block is implemented through a Wing Terraform Azure program." },
  "wing/tf-gcp":   { id: "wing/tf-gcp",    description: "Block is implemented through a Wing Terraform GCP program." },
  tofu:            { id: "tofu",           description: "Block is implemented through an OpenTofu program." },
  cdk8s:           { id: "cdk8s",          description: "Block is implemented through a CDK8s program (in TypeScript)." },
  noop:            { id: "noop",           description: "Block does nothing (just a declaration)." },
  custom:          { id: "custom",         description: "Block is implemented through a set of custom programs for CREATE/UPDATE and DELETE." },
};

// the name of the attribute that contains the Terraform state for Terraform-based blocks
export const TFSTATE_ATTRIBUTE = "tfstate";

// the name of the attribute that contains the last state hash for all blocks
export const LAST_STATE_HASH_ATTRIBUTE = "lastStateHash";
