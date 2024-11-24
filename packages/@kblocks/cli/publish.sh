#!/bin/bash
set -euo pipefail
npm run build-only
../../../scripts/helm-publish.sh ./dist
rm *.tgz

../../../scripts/npm-publish.sh
