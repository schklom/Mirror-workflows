FROM node:lts-alpine AS build

WORKDIR /app

COPY frontend/ ./
RUN --mount=type=cache,target=/root/.cache/yarn \
    --mount=type=cache,target=/app/node_modules
RUN yarn install
RUN yarn build
RUN find ./dist/ -type f -name '*.js' \
     -exec sed -i 's/http:\/\/localhost:9090/https:\/\/backend/g' '{}' \;

FROM caddy:alpine

COPY --from=build /app/dist/ /var/www/html
COPY docker/frontend.Caddyfile /etc/caddy/Caddyfile

EXPOSE 443