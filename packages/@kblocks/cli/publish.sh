#!/bin/bash
set -euo pipefail
npm run build
../../../scripts/helm-publish.sh ./dist
../../../scripts/npm-publish.sh
