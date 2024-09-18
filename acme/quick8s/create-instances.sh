#!/bin/sh
set -euo pipefail

export QUICK8S_POOL_BUCKET="eladb-quick8s-pool"

wing compile -t tf-aws test.main.w

terraform -chdir=target/test.main.tfaws init
terraform -chdir=target/test.main.tfaws apply -auto-approve
