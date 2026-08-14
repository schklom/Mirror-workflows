FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force
COPY server.js ./

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000
CMD ["node", "server.js"]

HEALTHCHECK --interval=5m \
             --timeout=5s \
             --retries=3 \
             CMD wget --spider -q http://localhost:${PORT}/api/config