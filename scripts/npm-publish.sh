#!/bin/bash
set -euo pipefail

set -x

dir=$(cd $(dirname $0) && pwd)

if [ -z "$KBLOCKS_VERSION" ]; then
    echo "Error: KBLOCKS_VERSION is not set. Please set the KBLOCKS_VERSION environment variable." >&2
    exit 1
fi

echo "KBLOCKS_VERSION=$KBLOCKS_VERSION"

# There shouldn't be any .tgz files in the current directory at this point
tgz_count="$((ls -1 *.tgz 2>/dev/null || true) | wc -l | xargs)"

if [ "$tgz_count" -gt 0 ]; then
  echo "Error: More than one .tgz file found in the current directory." >&2
  ls -1 *.tgz
  exit 1
fi

# Bump the package version
$dir/bump-pack/bin/bump-pack.cjs -b

tarball=$(ls -1 *.tgz)

echo "Publishing $tarball to npm..."

# Attempt to publish the package
if npm publish $tarball --access public; then
  echo "Package published successfully"
  exit 0
else
  echo "Failed to publish package. Trying again to see if it's already published..."

  # Try again, but capture the output of the failed publish attempt
  error_output=$(npm publish $tarball --access public 2>&1)
  
  if echo "$error_output" | grep -q "You cannot publish over the previously published versions"; then
    echo "Package already exists on the registry, skipping"
    exit 0
  else
    echo "Publishing package failed. Error:" >&2
    echo "$error_output" >&2
    exit 1
  fi
fi
