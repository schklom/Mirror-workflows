FROM golang:bullseye AS build

WORKDIR /app

COPY backend/ ./
RUN go mod download
RUN go build -v -o wwbackend ./...
#
RUN rm -rf whisper.cpp
RUN bash -c "git clone https://github.com/ggerganov/whisper.cpp &> /dev/null"
WORKDIR /app/whisper.cpp
RUN bash -c  "models/download-ggml-model.sh small &> /dev/null"
RUN bash -c "make small &> /dev/null"
#

FROM debian:bullseye-slim

RUN apt update
RUN apt install -y apt-transport-https debian-keyring debian-archive-keyring curl gpg
RUN curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
RUN curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
RUN apt update
RUN apt install -y caddy ffmpeg

WORKDIR /app
COPY --from=build /app/ ./
COPY docker/backend.Caddyfile /etc/caddy/Caddyfile
RUN chmod +x /app/wwbackend

EXPOSE 443
CMD ["./wwbackend"]