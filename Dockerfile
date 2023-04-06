FROM node:18-buster-slim as build

RUN npm i -g pnpm

RUN mkdir /app
RUN chown node:node -R /app
USER node
WORKDIR /app
ADD pnpm-lock.yaml .
# ADD package-lock.json .
ADD package.json .
RUN pnpm config set store-dir .pnpm-store
RUN pnpm install

ADD --chown=1000:1000 . /app/

RUN pnpm run build
ENV NODE_ENV production
RUN pnpm install
RUN pnpm store prune

FROM node:18-buster-slim as run

ENV DEBIAN_FRONTEND noninteractive
RUN apt-get update \
 && apt-get install -y xvfb libasound2 libnss3 libgconf-2-4 libxss1 libgtk-3-0 libgbm-dev --no-install-recommends

COPY --from=build /app /app/

WORKDIR /app
ENV NODE_ENV production
EXPOSE 3000

CMD /app/docker-entrypoint.sh npm run start
