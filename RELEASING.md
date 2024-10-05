# Releasing

This document describes how to publish a new release for FMD Server.

1. Update the `const VERSION = ...` in `fmdserver.go`
2. Commit and push
3. Tag the new release: `git tag v0.0.0` and push the tag: `git push --tags`
4. Create a new release on Gitlab: https://gitlab.com/Nulide/findmydeviceserver/-/releases
5. Wait for the Docker image build to finish, and briefly test that the image works
