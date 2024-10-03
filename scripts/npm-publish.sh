#!/bin/bash
set -euo pipefail

# Check if there's more than one .tgz file
tgz_count=$(ls -1 *.tgz 2>/dev/null | wc -l)

if [ "$tgz_count" -gt 1 ]; then
    echo "Error: More than one .tgz file found in the current directory." >&2
    ls -1 *.tgz
    exit 1
fi

if [ "$tgz_count" -eq 0 ]; then
    echo "Error: No .tgz file found in the current directory." >&2
    exit 1
fi

# Attempt to publish the package
if npm publish *.tgz --access public; then
  echo "Package published successfully"
  exit 0
else
  # Try again, but capture the output of the failed publish attempt
  error_output=$(npm publish *.tgz --access public 2>&1)
  
  if echo "$error_output" | grep -q "You cannot publish over the previously published versions"; then
    echo "Package already exists on the registry, skipping"
    exit 0
  else
    echo "Publishing package failed. Error:" >&2
    echo "$error_output" >&2
    exit 1
  fi
fi
