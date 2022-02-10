FROM alpine/git:latest AS gitimport
RUN git clone -b FindMyDeviceServer --single-branch https://github.com/schklom/Mirror-workflows.git /fmd


FROM golang:alpine AS builder
# We know from test that $GOPATH=/go
WORKDIR /go/src/fmd

# Install bash curl gcc ldconfig+read (updated) sed
RUN apk --no-cache add bash curl build-base musl-utils zsh-doc sed
# MAYBE REMOVE????
RUN apk --no-cache add util-linux pciutils usbutils coreutils binutils findutils grep iproute2

# ATTEMPT DEBUG
RUN curl -s -o /tmp/install.sh https://raw.githubusercontent.com/objectbox/objectbox-go/main/install.sh
RUN sed -i '1 i set +x' /tmp/install.sh
RUN bash /tmp/install.sh
#RUN set +x
#RUN curl -s https://raw.githubusercontent.com/objectbox/objectbox-go/main/install.sh | bash -x
#RUN set -x

COPY --from=gitimport /fmd/ /go/src/fmd/
WORKDIR /go/src/fmd/cmd
#RUN go build fmdserver.go
RUN go build -o fmdserver

RUN mkdir -p /fmd/web
VOLUME /fmd
RUN mv /go/src/fmd/web/ /fmd/web/
RUN mv /go/src/fmd/cmd/fmdserver /fmd/fmdserver
RUN rm -rf /go/src/fmd

#FROM golang:alpine
#VOLUME /fmd
#COPY --from=builder /go/src/fmd/web /fmd/web/
#COPY --from=builder /go/src/fmd/cmd/fmdserver /fmd/
#COPY --from=builder /go/src/fmd/objectboxlib /fmd/objectboxlib

WORKDIR /fmd

# https://gitlab.com/Nulide/findmydeviceserver/-/issues/3
# HTTP
EXPOSE 1020/tcp
# HTTPS
EXPOSE 1008/tcp

ENTRYPOINT [ "/fmd/fmdserver" ]
