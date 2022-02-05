FROM alpine/git:latest AS builder
RUN git clone -b FindMyDeviceServer --single-branch https://github.com/schklom/Mirror-workflows.git /fmd

FROM golang:latest
# We know from test that GOPATH=/go
RUN mkdir -p $GOPATH/src/FindMyDeviceServer
WORKDIR $GOPATH/src/FindMyDeviceServer
RUN bash <(curl -s https://raw.githubusercontent.com/objectbox/objectbox-go/main/install.sh)
  
COPY --from=builder /fmd $GOPATH/src/FindMyDeviceServer
WORKDIR $GOPATH/src/FindMyDeviceServer/cmd
RUN go build fmdserver.go

# https://gitlab.com/Nulide/findmydeviceserver/-/issues/3
# HTTP
EXPOSE 1020/tcp
# HTTPS
EXPOSE 1008/tcp

#VOLUME ??
CMD fmdserver
