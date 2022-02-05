FROM alpine/git:latest AS builder
RUN git clone -b FindMyDeviceServer --single-branch https://github.com/schklom/Mirror-workflows.git /fmd

FROM golang:latest
COPY --from=builder /fmd .
WORKDIR cmd
RUN env
# https://stackoverflow.com/questions/59144120/gopath-go-mod-exists-but-should-not-in-aws-elastic-beanstalk/62062562#62062562
RUN unset GOPATH
RUN go build fmdserver.go

# https://gitlab.com/Nulide/findmydeviceserver/-/issues/3
# HTTP
EXPOSE 1020/tcp
# HTTPS
EXPOSE 1008/tcp

RUN ls -alh
#VOLUME ??
CMD fmdserver
