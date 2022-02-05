FROM alpine/git:latest AS builder
RUN git clone --progress --verbose -b FindMyDeviceServer --single-branch https://github.com/schklom/Mirror-workflows.git /fmd

FROM golang:latest
COPY --from=builder /fmd .
WORKDIR cmd
RUN go build -race -ldflags "-extldflags '-static'" -o fmdserver

# https://gitlab.com/Nulide/findmydeviceserver/-/issues/3
# HTTP
EXPOSE 1020/tcp
# HTTPS
EXPOSE 1008/tcp

RUN ls -alh
#VOLUME ??
CMD fmdserver
