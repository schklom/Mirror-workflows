# Releasing

This document describes how to publish a new release for FMD Server.

1. Update the `const VERSION = ...` in `root.go`.
1. Update the version examples in the README.
1. Commit and push.
1. Tag the new release: `git tag v0.0.0` and push the tag: `git push --tags`.
1. Create a new release on Gitlab: https://gitlab.com/Nulide/findmydeviceserver/-/releases.
1. Wait for the Docker image build to finish, and briefly test that the image works.
