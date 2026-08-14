FROM node:22-alpine

ARG VERSION=dev
ARG VCS_REF=dev
ARG BUILD_DATE=unknown

LABEL maintainer="Duarte Santos https://github.com/DuarteSantos8" \
    org.opencontainers.image.title="opengym-api" \
    org.opencontainers.image.description="Backend for Self-hosted gym & body-weight tracker — plan routines, log workouts (supersets & cardio too), track your weight and progress, passkey login. Your data, your server." \
    org.opencontainers.image.source="https://github.com/DuarteSantos8/openGym" \
    org.opencontainers.image.url="http://ghcr.io/duartesantos8/opengym-api" \
    org.opencontainers.image.documentation="https://github.com/DuarteSantos8/openGym#" \
    org.opencontainers.image.licenses="AGPL-3.0 license" \
    org.opencontainers.image.version=$VERSION \
    org.opencontainers.image.revision=$VCS_REF \
    org.opencontainers.image.created=$BUILD_DATE

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force
COPY server.js ./

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000
CMD ["node", "server.js"]

HEALTHCHECK --interval=5m \
            --timeout=5s \
            --retries=3 \
            CMD wget --spider -q http://localhost:${PORT}/api/config