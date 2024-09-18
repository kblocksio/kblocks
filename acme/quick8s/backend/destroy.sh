#!/bin/sh
set -euo pipefail
wing compile main.w
terraform -chdir=target/main.tfaws destroy

