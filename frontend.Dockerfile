FROM node:lts-alpine AS build

WORKDIR /app

COPY frontend/ ./
RUN yarn install

#ARG DOMAIN_NAME
#ENV DOMAIN_NAME "$DOMAIN_NAME"

ARG ALLOW_FILE_UPLOADS
ENV ALLOW_FILE_UPLOADS "$ALLOW_FILE_UPLOADS"

ARG RUN_AS_API
ENV RUN_AS_API "$RUN_AS_API"


ARG OPENAI_TOKEN
ENV OPENAI_TOKEN "$OPENAI_TOKEN"

RUN echo "$DOMAIN_NAME"


RUN find /app/src -type f -exec sed -i "s#ALLOW_FILES#${ALLOW_FILE_UPLOADS}#g" {} +
RUN find /app/src -type f -exec sed -i "s#RUN_AS_API#${RUN_AS_API}#g" {} +
RUN yarn build

WORKDIR /app/dist
#RUN find /app/dist -type f -exec sed -i "s#DOMAIN_NAME#${DOMAIN_NAME}#g" {} +


FROM caddy:2-alpine
COPY --from=build /app/dist/ /var/www/html
COPY docker/frontend.Caddyfile /etc/caddy/Caddyfile

EXPOSE 80