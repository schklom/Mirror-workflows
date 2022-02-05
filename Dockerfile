FROM alpine/git:latest AS builder
RUN git clone -b FindMyDeviceServer --single-branch https://github.com/schklom/Mirror-workflows.git /fmd

FROM golang:latest
RUN REPO_NAME=FindMyDeviceServer
# We know from test that GOPATH=/go
RUN DIRECTORY=$GOPATH/src/$REPO_NAME

RUN env
RUN mkdir -p ${DIRECTORY}
WORKDIR ${DIRECTORY}
RUN bash <(curl -s https://raw.githubusercontent.com/objectbox/objectbox-go/main/install.sh)
  
COPY --from=builder /fmd ${DIRECTORY}
WORKDIR ${DIRECTORY}/cmd
RUN go build fmdserver.go

# https://gitlab.com/Nulide/findmydeviceserver/-/issues/3
# HTTP
EXPOSE 1020/tcp
# HTTPS
EXPOSE 1008/tcp

#VOLUME ??
CMD fmdserver
