FROM golang:bullseye AS builder

WORKDIR /go/src/findmydeviceserver
ENV GOPATH /go

COPY . ./

ADD https://raw.githubusercontent.com/objectbox/objectbox-go/main/install.sh objectbox-install.sh
RUN chmod u+x objectbox-install.sh \
 && ./objectbox-install.sh

RUN go build -o /fmd cmd/fmdserver.go



FROM debian:bullseye-slim

COPY --from=builder /fmd /fmd/server
COPY --from=builder /usr/lib/libobjectbox.so /usr/lib/libobjectbox.so
COPY web /fmd/web
COPY extra /fmd/extra

RUN useradd -m -u 1000 user
RUN mkdir /fmd/objectbox \
 && chown user:user /fmd/objectbox
USER user

EXPOSE 1020/tcp
VOLUME /data


ENTRYPOINT ["/fmd/server"]
