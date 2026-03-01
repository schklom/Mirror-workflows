#!/usr/bin/env bash

# https://github.com/shenxn/protonmail-bridge-docker/pull/139/changes
# Add libfido2-dev libcbor-dev to first build stage
# Add libfido2-1 to second stage
cp build/Dockerfile build/Dockerfile.bak
sed -i "s/build-essential/build-essential libfido2-dev libcbor-dev/" build/Dockerfile
sed -i "s/ca-certificates/ca-certificates libfido2-1/" build/Dockerfile

echo "Changes in build/Dockerfile"
diff build/Dockerfile.bak build/Dockerfile
rm build/Dockerfile.bak
