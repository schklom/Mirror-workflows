FROM node:18-buster-slim as build

RUN npm i -g pnpm

RUN mkdir /app
RUN chown node:node -R /app
USER node
ENV NODE_ENV staging
WORKDIR /app
RUN pnpm config set store-dir .pnpm-store

ADD --chown=1000:1000 . /app/

WORKDIR /app/ui
RUN pnpm install
RUN pnpm run build-only && pnpm run build:inner
RUN rm -rf node_modules src public

WORKDIR /app
RUN pnpm install
RUN pnpm run build
ENV NODE_ENV production
RUN pnpm install
RUN pnpm store prune

FROM node:18-buster-slim as run

ENV DEBIAN_FRONTEND noninteractive
ENV HOME /home/node
RUN apt-get update \
 && apt-get install -y xvfb libasound2 libnss3 libgconf-2-4 libxss1 libgtk-3-0 libgbm-dev --no-install-recommends

COPY --from=build /app /app/

WORKDIR /app
ENV NODE_ENV production
EXPOSE 3000
USER root

CMD /app/docker-entrypoint.sh
