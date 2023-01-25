FROM golang:bullseye AS build

WORKDIR /app

# Build Go backend
COPY backend/ ./
RUN go mod download
RUN go build -v -o wwbackend ./...

# Get necessary Software
RUN rm -rf whisper.cpp
RUN apt update
RUN apt remove -y wget
RUN apt install -y unzip curl

WORKDIR /whisper
# Get latest working whisper version
RUN bash -c "curl -L --output v1.1.1.zip https://github.com/ggerganov/whisper.cpp/archive/refs/tags/v1.1.1.zip"
RUN bash -c "unzip v1.1.1.zip &> /dev/null"
RUN mv whisper.cpp-1.1.1 whisper.cpp

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

RUN apt update
RUN apt install -y ffmpeg
COPY --from=build /app/ ./
COPY --from=build /whisper/whisper.cpp/main ./whisper.cpp/
COPY --from=build /whisper/whisper.cpp/models ./whisper.cpp/models
RUN rm -rf ./whisper.cpp/samples/*
RUN chmod +x ./wwbackend


EXPOSE 9090
CMD ["./wwbackend"]