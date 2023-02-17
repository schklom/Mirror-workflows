FROM golang:bullseye AS build

WORKDIR /app

# Build Go backend
COPY backend/ ./
RUN apt update
RUN go build -v -o wwbackend ./...

# Get necessary Software
RUN rm -rf whisper.cpp
RUN apt remove -y wget
RUN apt install -y unzip curl

WORKDIR /whisper
# Get latest working whisper version
RUN bash -c "curl -L --output v1.2.0.zip https://github.com/ggerganov/whisper.cpp/archive/refs/tags/v1.2.0.zip"
RUN bash -c "unzip v1.2.0.zip &> /dev/null"
RUN mv whisper.cpp-1.2.0 whisper.cpp

# Get and make whisper.cpp models and binary
WORKDIR /whisper/whisper.cpp

ARG WHISPER_MODEL
ENV WHISPER_MODEL "$WHISPER_MODEL"

# Clean unnecessary folders
RUN chmod +x models/*.sh
RUN bash -c  "models/download-ggml-model.sh $WHISPER_MODEL &> /dev/null"
RUN bash -c "make $WHISPER_MODEL &> /dev/null"

# Prepare working environment
FROM golang:bullseye

WORKDIR /app

ARG CUT_MEDIA_SECONDS
ENV CUT_MEDIA_SECONDS "$CUT_MEDIA_SECONDS"

ARG WHISPER_MODEL
ENV WHISPER_MODEL "$WHISPER_MODEL"

ARG KEEP_FILES
ENV KEEP_FILES "$KEEP_FILES"

ARG WHISPER_THREADS
ENV WHISPER_THREADS "$WHISPER_THREADS"

ARG WHISPER_PROCESSORS
ENV WHISPER_PROCESSORS "$WHISPER_PROCESSORS"

RUN apt update && apt install -y curl xz-utils
RUN curl -L https://nixos.org/nix/install > install
RUN chmod +x install
RUN ./install --daemon
RUN rm install
SHELL ["/bin/bash", "--login" , "-c"]
RUN nix-env -iA nixpkgs.yt-dlp
RUN nix-env -iA nixpkgs.ffmpeg_5
ENV PATH "$PATH:/root/.nix-profile/bin"
COPY --from=build /app/ ./
COPY --from=build /whisper/whisper.cpp/main ./whisper.cpp/
COPY --from=build /whisper/whisper.cpp/models ./whisper.cpp/models
RUN rm -rf ./whisper.cpp/samples/*
RUN mkdir ./whisper.cpp/samples
RUN chmod +x ./wwbackend


EXPOSE 9090
CMD ["./wwbackend"]