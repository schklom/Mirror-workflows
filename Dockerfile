FROM golang:bookworm AS builder

WORKDIR /go/src/findmydeviceserver
ENV GOPATH /go

RUN apt update && apt install -y npm

COPY . ./

ADD https://raw.githubusercontent.com/objectbox/objectbox-go/main/install.sh objectbox-install.sh
RUN chmod u+x objectbox-install.sh \
      && ./objectbox-install.sh

RUN go build -o /fmd cmd/fmdserver.go
RUN npm install



FROM debian:bookworm-slim

RUN apt update && apt install -y ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder /fmd /fmd/server
COPY --from=builder /go/src/findmydeviceserver/node_modules /fmd/web/node_modules
COPY --from=builder /usr/lib/libobjectbox.so /usr/lib/libobjectbox.so

COPY web /fmd/web
COPY extra /fmd/extra

RUN useradd --create-home --uid 1000 fmd-user
RUN mkdir /fmd/objectbox \
      && chown fmd-user:fmd-user /fmd/objectbox
USER fmd-user

EXPOSE 1020/tcp
VOLUME /data


ENTRYPOINT ["/fmd/server"]
