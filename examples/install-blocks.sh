#!/bin/bash
#------------------------------------------------------------------------------#
# usage: ./install.sh [kblock]
# if no kblock is provided, all kblocks will be installed
#------------------------------------------------------------------------------#
set -eu
dir=$(cd $(dirname $0) && pwd)
cd $dir

KBLOCKS_CLI=${KBLOCKS_CLI:-"npx kb"}
KBLOCKS_PUBSUB_HOST="${KBLOCKS_PUBSUB_HOST:-}"
KBLOCKS_PUBSUB_KEY="${KBLOCKS_PUBSUB_KEY:-}"
KBLOCKS_STORAGE_PREFIX="${KBLOCKS_STORAGE_PREFIX:-}"
KBLOCKS_ACCESS="${KBLOCKS_ACCESS:-}"

context=$(kubectl config current-context)

if [ "$context" == "kind-kind" ]; then
  KBLOCKS_PUBSUB_HOST=portal-redis.default.svc.cluster.local
  KBLOCKS_PUBSUB_KEY="pass1234"
  KBLOCKS_ACCESS="read_write"
fi

echo "KBLOCKS_PUBSUB_HOST: $KBLOCKS_PUBSUB_HOST"
echo "KBLOCKS_STORAGE_PREFIX: $KBLOCKS_STORAGE_PREFIX"
echo "KBLOCKS_ACCESS: $KBLOCKS_ACCESS"
echo "KBLOCKS_CLI: $KBLOCKS_CLI"

#------------------------------------------------------------------------------#
# install_kblock
#------------------------------------------------------------------------------#
install_kblock() {
  dir=$1
  (
    cd $dir
    name=$(basename $dir)
    echo "Installing block: $PWD..."

    if [ -n "${KBLOCKS_PUBSUB_HOST}" ]; then
      KBLOCKS_PUBSUB_HOST_OPTION="-e KBLOCKS_PUBSUB_HOST=${KBLOCKS_PUBSUB_HOST}"
    else
      KBLOCKS_PUBSUB_HOST_OPTION=""
    fi

    if [ -n "${KBLOCKS_PUBSUB_KEY}" ]; then
      KBLOCKS_PUBSUB_KEY_OPTION="-e KBLOCKS_PUBSUB_KEY=${KBLOCKS_PUBSUB_KEY}"
    else
      KBLOCKS_PUBSUB_KEY_OPTION=""
    fi

    if [ -n "${KBLOCKS_STORAGE_PREFIX}" ]; then
      KBLOCKS_STORAGE_PREFIX_OPTION="-e KBLOCKS_STORAGE_PREFIX=${KBLOCKS_STORAGE_PREFIX}"
    else
      KBLOCKS_STORAGE_PREFIX_OPTION=""
    fi

    if [ -n "${KBLOCKS_ACCESS}" ]; then
      KBLOCKS_ACCESS_OPTION="-e KBLOCKS_ACCESS=${KBLOCKS_ACCESS}"
    else
      KBLOCKS_ACCESS_OPTION=""
    fi

    # Now run the command with the options included conditionally
    $KBLOCKS_CLI install \
      $KBLOCKS_PUBSUB_HOST_OPTION \
      $KBLOCKS_PUBSUB_KEY_OPTION \
      $KBLOCKS_STORAGE_PREFIX_OPTION \
      $KBLOCKS_ACCESS_OPTION \
      -n kblocks \
      --release-name $name
  )
}

# if there are any arguments, use them to determine which kblocks to install otherwise, install all
# kblocks
blocks=$@

if [ -z "$blocks" ]; then
  blocks=$(find kblocks -maxdepth 1 -type d -not -path kblocks -not -path "*/dist")
  echo "No arguments provided, installing all kblocks..."
fi

for name in $blocks; do
  install_kblock $name
done
