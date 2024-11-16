FROM golang:1.22-bookworm AS builder

WORKDIR /go/src/findmydeviceserver
ENV GOPATH=/go

# pre-download and only redownload in subsequent builds if they change
COPY go.mod go.sum ./
RUN go mod download && go mod verify

# Only copy Go files to avoid rebuilding Go when only web files have changed
COPY go.mod .
COPY go.sum .
COPY main.go .
COPY cmd/ cmd/
COPY user/ user/
COPY utils/ utils/

RUN go build -o /tmp/fmd main.go


FROM debian:bookworm-slim

RUN apt update && apt install -y ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder /tmp/fmd /fmd/server

COPY web /fmd/web

RUN mkdir /fmd/db

RUN useradd --create-home --uid 1000 fmd-user
RUN chown -R fmd-user:fmd-user /fmd/

USER fmd-user
WORKDIR /fmd

EXPOSE 8080/tcp
EXPOSE 8443/tcp

ENTRYPOINT ["/fmd/server", "serve"]
