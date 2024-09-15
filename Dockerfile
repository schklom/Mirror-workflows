FROM golang:bookworm AS builder

WORKDIR /go/src/findmydeviceserver
ENV GOPATH=/go

# pre-download and only redownload in subsequent builds if they change
COPY go.mod go.sum ./
RUN go mod download && go mod verify

ADD https://raw.githubusercontent.com/objectbox/objectbox-go/main/install.sh objectbox-install.sh
RUN chmod u+x objectbox-install.sh \
      && ./objectbox-install.sh

# Only copy Go files to avoid rebuilding Go when only web files have changed
COPY go.mod .
COPY go.sum .
COPY cmd/ cmd/
COPY user/ user/
COPY utils/ utils/

RUN go build -o /fmd cmd/fmdserver.go


FROM debian:bookworm-slim

RUN apt update && apt install -y ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder /fmd /fmd/server
COPY --from=builder /usr/lib/libobjectbox.so /usr/lib/libobjectbox.so

COPY web /fmd/web
COPY extra /fmd/extra

# Old objectbox dir
RUN mkdir /fmd/objectbox
RUN mkdir /fmd/db

RUN useradd --create-home --uid 1000 fmd-user
RUN chown -R fmd-user:fmd-user /fmd/
USER fmd-user

EXPOSE 8080/tcp
EXPOSE 8443/tcp
VOLUME /data


ENTRYPOINT ["/fmd/server"]
