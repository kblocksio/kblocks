#!/bin/bash
set -euo pipefail
dir=$(cd $(dirname $0) && pwd)
$dir/bump-pack/bin/bump-pack.cjs -b