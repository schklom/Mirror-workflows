# Two targets from one file.
#
#   default (built when no --target is given) — what every instance has always got. No AI
#           runtime, no AI dependency: `npm ci --omit=optional` skips the Agent SDK and its
#           platform runtime entirely, so an owner who never wanted the Coach carries none of it.
#   coach                                     — the same image plus the Claude Agent SDK.
#
# Build the opt-in one with:  docker build --target coach ./api
# or through compose with:    API_TARGET=coach docker compose up --build
#
# The stage order matters: Docker builds the *last* stage when none is named, so `default` is
# deliberately last and `coach` sits above it.

FROM node:22-alpine AS base
WORKDIR /app

# The unprivileged user Coach jobs drop to. Its uid cannot read /data, which is the control that
# keeps a provider runtime away from users, passkeys and the session secret.
#
# Not optional, and not only for the real providers: canDropPrivileges() fails closed on Linux,
# so in an image without this user *every* job is refused with "no `coach` user exists in this
# image" — including the fixture provider that exists precisely so the loop can be walked before
# an account is connected. It costs one line and no bytes worth measuring.
RUN adduser -D -H -s /sbin/nologin coach

COPY package.json package-lock.json* ./
# `npm ci` rather than `npm install`: the lockfile is the point of committing one, and the SDK's
# per-platform runtime is resolved from it (musl on this base) rather than from whatever the
# build host happened to be.
RUN npm ci --omit=dev --omit=optional && npm cache clean --force

COPY server.js ./
COPY coach ./coach
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]

# ---------------------------------------------------------------------------------------------
# The opt-in target. Dropping --omit=optional is the whole difference: it pulls in
# @anthropic-ai/claude-agent-sdk together with the one platform runtime this base needs
# (linux-*-musl), both pinned by the lockfile.
FROM base AS coach
RUN npm ci --omit=dev && npm cache clean --force

# ---------------------------------------------------------------------------------------------
# Last, so that a plain `docker build ./api` keeps producing the runtime-free image.
FROM base AS default
