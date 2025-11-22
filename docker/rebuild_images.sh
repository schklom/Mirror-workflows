#!/bin/sh
# bash is not available in Docker-in-Docker in Gitlab CI

# Script to rebuild all Docker images for the latest FMD Server release.
#
# This should be run regularly, in order to bring in the latest OS patches from the base images.
# For background, see https://stevelasker.blog/2017/12/20/os-framework-patching-with-docker-containers-paradigm-shift/.
#
# This script is designed to be executed from the root of the git repository.

set -eux

VERSION=$(grep VERSION version/version.go | awk '{gsub(/"/, ""); print $4}')

echo "Rebuilding images for ${VERSION}"
echo ""

# Don't "rebuild" versions that have not yet been released
git fetch --tags
git tag | grep "${VERSION}" || (echo "git tag does not exist. Has this version been released?" && exit 1)

./docker/build_images.sh "${VERSION}"
