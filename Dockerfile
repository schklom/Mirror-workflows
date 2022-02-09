FROM alpine/git:latest AS gitimport
RUN git clone -b FindMyDeviceServer --single-branch https://github.com/schklom/Mirror-workflows.git /fmd

FROM golang:latest AS binary
# We know from test that $GOPATH=/go
RUN mkdir -p /go/src/fmd
WORKDIR /go/src/fmd
RUN curl -s https://raw.githubusercontent.com/objectbox/objectbox-go/main/install.sh | bash
  
COPY --from=gitimport /fmd $GOPATH/src/fmd
WORKDIR /go/src/fmd/cmd
#RUN go build fmdserver.go
RUN go build -o fmdserver

#RUN mv fmdserver ../
#WORKDIR $GOPATH/src/FindMyDeviceServer


FROM alpine:latest
COPY --from=binary /go/src/fmd/web /fmd/web/
COPY --from=binary /go/src/fmd/cmd/fmdserver /fmd/

# https://gitlab.com/Nulide/findmydeviceserver/-/issues/3
# HTTP
EXPOSE 1020/tcp
# HTTPS
EXPOSE 1008/tcp

#VOLUME ??
CMD /fmd/fmdserver
