# Dockerfiles for FMD Server

This directory contains the Dockerfiles that are used to provide pre-built Docker images.
They simply download the pre-built release artifacts, and bundle them.

The Dockerfile at the repository root is for development, and compiles from scratch.

## Testing locally

To test the multi-platform build locally, install QEMU:

```sh
docker run --privileged --rm tonistiigi/binfmt --install all
```

You also need to enable the [containerd image store](https://docs.docker.com/engine/storage/containerd/).

## References

- <https://docs.docker.com/build/building/multi-platform/>
- <https://www.docker.com/blog/multi-arch-build-what-about-gitlab-ci/>
- <https://www.docker.com/blog/faster-multi-platform-builds-dockerfile-cross-compilation-guide/>
