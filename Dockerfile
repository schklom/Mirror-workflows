# This Dockerfile is for building from source, e.g., during development.
# The production images are build from the Dockerfiles in the docker/ directory.

FROM golang:1.24-bookworm AS builder

WORKDIR /go/src/fmd-server
ENV GOPATH=/go

# Install Node.js and pnpm for building the web frontend
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash - && \
    apt-get install -y nodejs && \
    corepack enable && \
    corepack prepare pnpm@latest --activate

# Pre-download and only redownload in subsequent builds if they change
COPY go.mod go.sum ./
RUN go mod download && go mod verify

# Copy Go source files first (needed for embedding web assets)
COPY main.go .
COPY cmd/ cmd/
COPY backend/ backend/
COPY config/ config/
COPY metrics/ metrics/
COPY migrations/ migrations/
COPY user/ user/
COPY utils/ utils/
COPY version/ version/

# Copy web frontend files and build
COPY web/package.json web/pnpm-lock.yaml web/
WORKDIR /go/src/fmd-server/web
RUN pnpm install --frozen-lockfile

WORKDIR /go/src/fmd-server
# Copy web source files (excluding dist, node_modules, .next which may exist locally)
COPY web/*.go web/*.json web/*.ts web/*.mjs ./web/
COPY web/app ./web/app
COPY web/public ./web/public
WORKDIR /go/src/fmd-server/web
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN pnpm build

# Build Go binary (will embed the web/dist directory)
WORKDIR /go/src/fmd-server
RUN go build -o /tmp/fmd main.go


FROM debian:trixie-slim

RUN apt update && \
    apt install --no-install-recommends -y ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Create user
RUN useradd --no-create-home --uid 1000 fmd-server

# Copy files and configure permissions
# Note that the directories must be executable (for file listing, etc.)

ARG BIN_FILE=/opt/fmd-server
ARG DB_DIR=/var/lib/fmd-server/db

COPY --from=builder /tmp/fmd "$BIN_FILE"

RUN chown fmd-server:fmd-server "$BIN_FILE" && \
    chmod 0550 "$BIN_FILE"

RUN mkdir -p "$DB_DIR"

RUN chown -R fmd-server:fmd-server "$DB_DIR" && \
    chmod -R 0660 "$DB_DIR" && \
    chmod 0770 "$DB_DIR"

# Change to user
USER fmd-server

EXPOSE 8080/tcp
EXPOSE 8443/tcp

# XXX: Using $BIN_FILE doesn't work
ENTRYPOINT ["/opt/fmd-server", "serve", "--db-dir", "/var/lib/fmd-server/db"]
