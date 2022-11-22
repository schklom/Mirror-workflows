FROM node:lts-alpine AS build

WORKDIR /app

COPY frontend/ ./
RUN --mount=type=cache,target=/root/.cache/yarn \
    --mount=type=cache,target=/app/node_modules
RUN yarn install

RUN yarn build

FROM caddy:alpine

ARG DOMAIN_NAME
ENV DOMAIN_NAME $DOMAIN_NAME

COPY --from=build /app/dist/ /var/www/html
RUN find /var/www/html -name '*.js' -exec sed -i.bak "s/http:\/\/localhost:9090/$DOMAIN_NAME/g" {} +
COPY docker/frontend.Caddyfile /etc/caddy/Caddyfile

EXPOSE 443