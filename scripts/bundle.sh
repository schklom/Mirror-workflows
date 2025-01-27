#!/usr/bin/env bash

# Script to build and bundle FMD Server.
# This script should produce reproducible ZIPs (if the same version of Go is used!).

set -eu

REF=${1-}

if [ -z "$REF" ]; then
    echo "Error: missing git ref to build"
    echo "Usage: $0 <git-ref>"
    exit 1
fi

ZIPNAME="fmdserver-${REF}.zip"
HASHNAME="fmdserver-${REF}.zip.sha256sum"

OUTDIR="$PWD"
BUILDDIR=/tmp/fmdbuild

# TODO: support more targets
export GOOS=linux
export GOARCH=amd64

# -f is needed because some of git's file a write-protected by default
rm -rf $BUILDDIR || true
mkdir $BUILDDIR
pushd $BUILDDIR

# Do a clean checkout to avoid that uncomitted files sneak into the build
git clone --quiet "https://gitlab.com/Nulide/findmydeviceserver.git"
pushd findmydeviceserver
git checkout --quiet "$REF"

# Reproducibility: Disable cgo.
# cgo use glibc, which will result in different binaries when compiled on different OSes.
export CGO_ENABLED=0

# Reproducibility: Trim metadata.
# https://xnacly.me/posts/2023/go-metadata/
go build -ldflags="-w -s -buildid=" -trimpath

# Reproducibility: Include go version in ZIP.
go version | cut -d " " -f 3 > goversion.txt

# Reproducibility: Workaround to recursively include all files in web/.
# We cannot use "zip -r" because on some systems, this includes depth-first while on other
# systems it does breadth-first. This results in different orderings in the ZIP file.
WEBFILES=$(find web/ -type f | sort | tr '\n' ' ')

# Reproducibility: Set the timestamp of all files to the timestamp of the commit from which we build
GITTIME=$(git log -1 --format="%aI")
find . -type f -exec touch -d "$GITTIME" {} +

# Reproducibility: normalize file permissions (different build systems can have a different umask)
find . -type f -exec chmod 640 {} \;
find . -type d -exec chmod 750 {} \;

# Package all files
# Shellcheck ignore reason: we need the variable to split words by string
# shellcheck disable=SC2086
# Reproducibility: Fix timezone.
# Reproducibility: Use -X to remove subfields such as 0x7875.
TZ=utc zip -X "$ZIPNAME" \
    findmydeviceserver \
    $WEBFILES \
    config.example.yml \
    gen_cert.sh \
    nginx-example.conf \
    goversion.txt

cp "$ZIPNAME" "$OUTDIR"

# Output integrity checksum
sha256sum "$ZIPNAME" > "$OUTDIR/$HASHNAME"

popd
popd

rm -rf $BUILDDIR
