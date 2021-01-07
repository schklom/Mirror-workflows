FROM node:12-buster-slim

ENV DEBIAN_FRONTEND noninteractive

RUN apt-get update \
 && apt-get install -y xvfb libasound2 libnss3 libgconf-2-4 libxss1 libgtk-3-0

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

ENTRYPOINT /app/docker-entrypoint.sh
CMD npm run start
