FROM node:12.18.1-alpine
RUN apk --no-cache add git python3 make g++
WORKDIR /app
COPY . .
RUN npm install --no-optional
EXPOSE 10407
CMD ["npm", "start"]
