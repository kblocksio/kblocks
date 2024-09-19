#!/bin/sh
set -euo pipefail

export QUICK8S_POOL_BUCKET="eladb-quick8s-pool"
export QUICK8S_SUBNET_ID="subnet-0a13bdb902ca7970a"
export QUICK8S_VPC_ID="vpc-0e004aa77383c74c8"

wing compile -t tf-aws create-instances.main.w

terraform -chdir=target/create-instances.main.tfaws init
terraform -chdir=target/create-instances.main.tfaws apply -auto-approve
