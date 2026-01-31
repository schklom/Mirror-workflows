# Contributing to FMD Server

## Code Style

Logging:

- Log security-relevant events (e.g., password changes).
- Use log level "ERROR" for application errors/potential bugs.
  These are issues that the server operator should be aware of.
- Use log level "WARNING" -- among other things -- for user errors (e.g., invalid inputs).
  First, because these are user-facing anyway.
  Second, because they are less relevant to the server operator (since it is not something that they can fix).

## Building

Building the Snap:

```sh
# Setup
export SNAPCRAFT_BUILD_ENVIRONMENT=multipass
sudo snap install snapcraft --classic

# Build
sudo snapcraft clean
sudo snapcraft pack
sudo snap install --dangerous fmd-server_0.13.0_amd64.snap

# Publish
snapcraft login
snapcraft upload --release=stable fmd-server_0.13.0_amd64.snap
```

See:

- <https://documentation.ubuntu.com/snapcraft/stable/tutorials/craft-a-snap/>.
- <https://documentation.ubuntu.com/snapcraft/latest/how-to/crafting/add-a-snap-configuration/>
- <https://documentation.ubuntu.com/snapcraft/latest/how-to/publishing/>
- <https://forum.snapcraft.io/t/restrictions-on-screenshots-and-videos-in-snap-listings/3087/7>
- <https://askubuntu.com/questions/1162798/how-do-i-view-the-contents-of-a-snap-file>

## Versions

Because we use Debian as the primary build environment for releases,
the [Go](https://packages.debian.org/testing/golang) and
[NodeJS](https://packages.debian.org/testing/nodejs) major versions should track
the versions that are available in Debian testing.

Motivation: Debian stable can be a bit outdated (especially with NodeJS).
And in a build environment, we don't need the absolute reliability that stable provides.
As a rolling release, testing is a good balance between stability and freshness.
