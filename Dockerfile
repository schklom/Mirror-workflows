FROM alpine/git:latest AS gitimport
RUN git clone -b FindMyDeviceServer --single-branch https://github.com/schklom/Mirror-workflows.git /fmd


FROM golang:latest AS builder
# We know from test that $GOPATH=/go
COPY --from=gitimport /fmd/ $GOPATH/src/fmd/
WORKDIR $GOPATH/src/fmd/
#RUN curl -s https://raw.githubusercontent.com/objectbox/objectbox-go/main/install.sh | bash

#RUN go build fmdserver.go
RUN go build -o fmdserver


FROM gcr.io/distroless/base-debian10
COPY --from=builder /go/src/fmd/web /fmd/web/
COPY --from=builder /go/src/fmd/cmd/fmdserver /fmd/

WORKDIR /fmd

# https://gitlab.com/Nulide/findmydeviceserver/-/issues/3
# HTTP
EXPOSE 1020/tcp
# HTTPS
EXPOSE 1008/tcp

VOLUME /fmd
ENTRYPOINT [ "/fmd/fmdserver" ]
