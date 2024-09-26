#!/bin/sh
set -euo pipefail

(cd packages/@kblocks/cli && npm run build)
(cd packages/@kblocks/worker && npm run build)
(cd packages/@kblocks/controller && npm run build)
