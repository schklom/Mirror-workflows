FROM node:12.18.1-alpine as build
RUN apk --no-cache add git python3 make g++
WORKDIR /app
COPY . .
RUN npm install --no-optional

FROM node:12.18.1-alpine as app
WORKDIR /app
COPY --from=build /app /app
EXPOSE 10407
CMD ["npm", "start"]
