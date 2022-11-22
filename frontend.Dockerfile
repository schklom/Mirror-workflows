FROM node:lts-alpine AS build

WORKDIR /app

COPY frontend/ ./
RUN --mount=type=cache,target=/root/.cache/yarn \
    --mount=type=cache,target=/app/node_modules
RUN yarn install

ARG DOMAIN_NAME
ENV DOMAIN_NAME "$DOMAIN_NAME"

ARG ALLOW_FILE_UPLOADS
ENV ALLOW_FILE_UPLOADS "$ALLOW_FILE_UPLOADS"

RUN echo "$DOMAIN_NAME"

RUN find /app -name '*.svelte' -exec sed -i "s/localhost:9090/$DOMAIN_NAME/g" {} +
RUN find /app -name '*.svelte' -exec sed -i "s/ALLOW_FILES/$ALLOW_FILE_UPLOADS/g" {} +

RUN yarn build

FROM caddy:alpine


COPY --from=build /app/dist/ /var/www/html
COPY docker/frontend.Caddyfile /etc/caddy/Caddyfile

EXPOSE 80