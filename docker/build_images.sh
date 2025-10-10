#!/usr/bin/env bash

# Script to build all Docker images for FMD Server.
# When run in the CI, it will push the images to the container registry.

# This script is designed to be executed from the root of the git repository.

set -eu

VERSION=${1-}

if [[ -z "$VERSION" ]]; then
    echo "Error: missing version to build" >&2
    echo "Usage: $0 <version>" >&2
    exit 1
fi

# ----- Prepare variables -----

# Strip any leading v if the version is given as v1.3.7 (shortest prefix).
VERSION=${VERSION#v}

# Removes the longest suffix of the form `.*`. Note that . is a literal dot.
# Thus if VERSION=1.3.7 then this removes .3.7 and leaves 1
# https://www.gnu.org/software/bash/manual/html_node/Shell-Parameter-Expansion.html
MAJOR_VERSION=${VERSION%%.*}

IMAGE_NAME="${CI_REGISTRY:-docker.io}/fmd-foss/fmd-server"

ARG_ANNOTATION="--annotation org.opencontainers.image.version=${VERSION} --annotation org.opencontainers.image.source=https://gitlab.com/fmd-foss/fmd-server --annotation org.opencontainers.image.licenses=GPL-3.0-or-later"

ARG_MULTI_PLATFORM="--platform linux/amd64,linux/arm/v7,linux/arm64/v8"

if [[ "${CI-}" ]]; then
    # buildx multiplatform build sometimes fails in Gitlab CI: https://github.com/docker/buildx/issues/584
    docker run --rm --privileged multiarch/qemu-user-static --reset -p yes; docker buildx create --use
fi

ARG_PUSH=""
if [[ "${CI-}" ]]; then
    docker login -u "$CI_REGISTRY_USER" -p "$CI_REGISTRY_PASSWORD" "$CI_REGISTRY"
    ARG_PUSH="--push"
fi

# ----- Build and push -----

set -x

for BASE in "debian" "alpine" "distroless"; do
    echo "Building image based on ${BASE}..."

    ARG_TAGS="--tag ${IMAGE_NAME}:${VERSION}-${BASE} --tag ${IMAGE_NAME}:${MAJOR_VERSION}-${BASE}"

    if [[ "$BASE" = "debian" ]]; then
        # same, but without the -base suffix
        ARG_TAGS="$ARG_TAGS --tag ${IMAGE_NAME}:${VERSION} --tag ${IMAGE_NAME}:${MAJOR_VERSION}"
    fi

    # shellcheck disable=SC2086
    docker buildx build --no-cache --file "./docker/Dockerfile_${BASE}" --build-arg "FMD_SERVER_VERSION=${VERSION}" --pull ${ARG_PUSH} ${ARG_MULTI_PLATFORM} ${ARG_ANNOTATION} ${ARG_TAGS} .

done
