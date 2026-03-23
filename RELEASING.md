# Releasing

This document describes how to publish a new release for FMD Server.

Preparation:

1. Build and test both the binary **and** the Docker container.
1. Update the `const VERSION = ...` in Go.
1. Update the version examples in the README.
1. Update the version in the `snapcraft.yaml`.
1. Commit and push.

Building the package:

1. Tag the new release: `git tag v0.0.0 <commit-hash>` and push the tag: `git push --tags`.
1. Build the release package: `./scripts/bundle_repro.sh v0.0.0`
1. Check with the other maintainers that the package can be built reproducibly.
1. Sign the `fmd-server-v0.0.0.zip`
1. `scp` the package files to <https://packages.fmd-foss.org>.
1. Build the Snap as described in the [CONTRIBUTING.md](CONTRIBUTING.md).

Creating the release:

1. Wait for the Docker image build to finish, and briefly test that the image works.
1. Upload the Snap to the Snap store. Install it from there and test that it works.
1. Create a new release on Gitlab: <https://gitlab.com/fmd-foss/fmd-server/-/releases>.
