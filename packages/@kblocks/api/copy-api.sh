#!/bin/sh
set -euo pipefail
dirname=$(cd $(dirname $0); pwd)

rm -fr ./src/api
mkdir -p ./src/api
cp -rL $dirname/src/* ./src/api/
