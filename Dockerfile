# Simple Dockerfile to easily build an FMD Server Docker image from source/from git.
# The "real" pre-built images are built using the scripts in the docker/ directory.
# For development, install all tools locally (don't use this Dockerfile).

FROM golang:1.24-trixie AS builder

ENV NODE_ENV=production

RUN apt update && \
    apt install --no-install-recommends -y ca-certificates git golang zip nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /go/src/fmd-server
ENV GOPATH=/go
ENV CI=true

COPY . .

# Build web frontend, then build Go binary
RUN cd web && \
    corepack enable && \
    pnpm install --frozen-lockfile && \
    pnpm build && \
    cd ..

RUN go build -o /tmp/fmd main.go


FROM debian:13-slim

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
