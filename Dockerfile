FROM alpine/git:latest AS gitimport
RUN git clone -b FindMyDeviceServer --single-branch https://github.com/schklom/Mirror-workflows.git /fmd

FROM golang:latest AS binary
# We know from test that $GOPATH=/go
RUN mkdir -p /go/src/FindMyDeviceServer
WORKDIR /go/src/FindMyDeviceServer
RUN curl -s https://raw.githubusercontent.com/objectbox/objectbox-go/main/install.sh | bash
  
COPY --from=gitimport /fmd $GOPATH/src/FindMyDeviceServer
WORKDIR /go/src/FindMyDeviceServer/cmd
#RUN go build fmdserver.go
RUN go build -o fmdserver

#RUN mv fmdserver ../
#WORKDIR $GOPATH/src/FindMyDeviceServer


FROM alpine:latest
RUN mkdir -p /fmd/web
COPY --from=binary /go/src/FindMyDeviceServer/web /fmd/web/
COPY --from=binary /go/src/FindMyDeviceServer/cmd/fmdserver /fmd/

# https://gitlab.com/Nulide/findmydeviceserver/-/issues/3
# HTTP
EXPOSE 1020/tcp
# HTTPS
EXPOSE 1008/tcp

#VOLUME ??
CMD /fmd/fmdserver
