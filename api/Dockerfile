FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force
COPY server.js ./
COPY coach ./coach
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
