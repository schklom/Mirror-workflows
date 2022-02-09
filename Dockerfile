FROM alpine/git:latest AS gitimport
RUN git clone -b FindMyDeviceServer --single-branch https://github.com/schklom/Mirror-workflows.git /fmd

FROM golang:latest AS binary
# We know from test that $GOPATH=/go
RUN mkdir -p $GOPATH/src/FindMyDeviceServer
WORKDIR $GOPATH/src/FindMyDeviceServer
RUN curl -s https://raw.githubusercontent.com/objectbox/objectbox-go/main/install.sh | bash
  
COPY --from=gitimport /fmd $GOPATH/src/FindMyDeviceServer
WORKDIR $GOPATH/src/FindMyDeviceServer/cmd
#RUN go build fmdserver.go
RUN go build -o fmdserver

#RUN mv fmdserver ../
#WORKDIR $GOPATH/src/FindMyDeviceServer


FROM alpine:latest
WORKDIR /fmd
RUN mkdir -p web
COPY --from=binary $GOPATH/src/FindMyDeviceServer/web ./web/
COPY --from=binary $GOPATH/src/FindMyDeviceServer/cmd/fmdserver ./

# https://gitlab.com/Nulide/findmydeviceserver/-/issues/3
# HTTP
EXPOSE 1020/tcp
# HTTPS
EXPOSE 1008/tcp

#VOLUME ??
CMD fmdserver
