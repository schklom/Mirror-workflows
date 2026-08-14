# Multi-stage: build the React app, then serve it with nginx.
# Self-hosters never need Node locally — `docker compose up` builds everything.
#
# --platform=$BUILDPLATFORM pins the build stage to the host's native arch even when
# cross-building for other targets (e.g. amd64 host building an arm64 image). The build
# output (static JS/CSS/HTML) is arch-independent, so there's no reason to run it under
# QEMU — and QEMU-emulated npm installs are known to corrupt esbuild/rollup's platform-
# specific native binaries, which is what breaks `vite build` with unrelated-looking
# module-resolution errors.
FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci 2>/dev/null || npm install
COPY frontend/ ./
RUN npm run build

FROM nginx:alpine

ARG VERSION=dev
ARG VCS_REF=dev
ARG BUILD_DATE=unknown

LABEL maintainer="Duarte Santos https://github.com/DuarteSantos8" \
    org.opencontainers.image.title="opengym-web" \
    org.opencontainers.image.description="Frontend for Self-hosted gym & body-weight tracker — plan routines, log workouts (supersets & cardio too), track your weight and progress, passkey login. Your data, your server." \
    org.opencontainers.image.source="https://github.com/DuarteSantos8/openGym" \
    org.opencontainers.image.url="http://ghcr.io/duartesantos8/opengym-web" \
    org.opencontainers.image.documentation="https://github.com/DuarteSantos8/openGym#" \
    org.opencontainers.image.licenses="AGPL-3.0 license" \
    org.opencontainers.image.version=$VERSION \
    org.opencontainers.image.revision=$VCS_REF \
    org.opencontainers.image.created=$BUILD_DATE

COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
# exercise media (img/gif) is mounted at runtime from the media volume

HEALTHCHECK --interval=5m \
            --timeout=5s \
            --retries=3 \
            CMD curl -fs http://localhost/