FROM node:lts-alpine3.11

ENV DEBIAN_FRONTEND noninteractive

RUN apk add -U bash

RUN mkdir /app
ADD . /app/
RUN chown node:node -R /app
USER node
WORKDIR /app

RUN npm ci
RUN npm run build

#cannot set earlier because otherwise it will not install dev-devendencies used for build
ENV NODE_ENV production
RUN npm ci

EXPOSE 3000

CMD npm run start
