#!/usr/bin/env bash

# https://github.com/shenxn/protonmail-bridge-docker/pull/139/changes
# Add libfido2-dev libcbor-dev to first build stage, and libfido2-1 to second stage
sed -E "s/build-essential/build-essential libfido2-dev libcbor-dev/" build/Dockerfile
sed -E "s/ca-certificates/ca-certificates libfido2-1/" build/Dockerfile