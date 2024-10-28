FROM ghcr.io/linuxserver/homeassistant:latest

RUN apk update && \
    apk add iputils espeak alsa-utils && \
    apk cache clean
