#!/bin/sh
set -euo pipefail

export QUICK8S_POOL_BUCKET="eladb-quick8s-pool"
export QUICK8S_INSTANCE_NAME=${1:-}

if [ -z "$QUICK8S_INSTANCE_NAME" ]; then
  echo "Usage: $0 <instance-name>"
  exit 1
fi

wing compile -t tf-aws test.main.w

terraform -chdir=target/test.main.tfaws init
terraform -chdir=target/test.main.tfaws apply
