FROM node:14.5.0-alpine as build
RUN apk --no-cache add git python3 make g++
WORKDIR /app
COPY . .
COPY ./.config.js.default ./config.js
RUN npm install --no-optional

FROM node:14.5.0-alpine as app
WORKDIR /app
COPY --from=build /app /app
RUN apk add --no-cache graphicsmagick
EXPOSE 10407
CMD ["npm", "start"]
