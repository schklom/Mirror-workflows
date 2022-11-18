FROM node:bullseye

WORKDIR /app
COPY frontend/ ./
RUN npm i
RUN npm i yarn
RUN yarn

EXPOSE 5173
CMD ["yarn", "dev", "--host", "0.0.0.0"]