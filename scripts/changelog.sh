#!/bin/bash
set -euo pipefail
dirname=$(cd $(dirname $0); pwd)
$dirname/bump-pack/bin/bump-pack.cjs