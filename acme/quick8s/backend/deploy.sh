#!/bin/sh
set -euo pipefail
wing compile -t tf-aws main.w
terraform -chdir=target/main.tfaws init
terraform -chdir=target/main.tfaws apply
