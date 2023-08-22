FROM node:18-alpine AS build-env

WORKDIR /app
COPY package.json ./

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

RUN pnpm install

COPY . .

RUN pnpm run build

FROM gcr.io/distroless/nodejs18-debian11:nonroot

WORKDIR /app

COPY --from=build-env /app/next.config.mjs ./
COPY --from=build-env /app/.next /app/.next
COPY --from=build-env /app/node_modules /app/node_modules
COPY --from=build-env /app/public /app/public

CMD ["./node_modules/next/dist/bin/next", "start"]
