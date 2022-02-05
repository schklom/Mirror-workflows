#FROM ubuntu as builder
#RUN apt-get -y update
#RUN apt-get -y install git
FROM alpine/git:latest
RUN git clone https://gitlab.com/Nulide/findmydeviceserver.git /

FROM golang:latest
COPY --from=builder /findmydeviceserver .
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
