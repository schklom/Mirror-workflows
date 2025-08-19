FROM golang:1.24-bookworm AS builder

WORKDIR /go/src/fmd-server
ENV GOPATH=/go

# pre-download and only redownload in subsequent builds if they change
COPY go.mod go.sum ./
RUN go mod download && go mod verify

COPY go.mod .
COPY go.sum .
COPY main.go .
COPY cmd/ cmd/
COPY backend/ backend/
COPY config/ config/
COPY metrics/ metrics/
COPY user/ user/
COPY utils/ utils/
COPY web/ web/

RUN go build -o /tmp/fmd main.go


FROM debian:bookworm-slim

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
