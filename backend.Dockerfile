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

ARG ARCHITECTURE
ENV ARCHITECTURE "$ARCHITECTURE"

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

# Get and install latest ffmpeg
RUN apt update && apt install -y xz-utils tar
RUN wget "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-$ARCHITECTURE-static.tar.xz"
RUN tar xvf ffmpeg-release-${ARCHITECTURE}-static.tar.xz
RUN mv ffmpeg*/ffmpeg /bin/ffmpeg
RUN rm -rf ffmpeg*

# Get and install yt-dlp
RUN wget https://github.com/yt-dlp/yt-dlp/releases/download/2023.02.17/yt-dlp_linux
RUN mv yt-dlp_linux yt-dlp
RUN chmod +x yt-dlp
RUN mv yt-dlp /bin/yt-dlp

SHELL ["/bin/bash", "--login" , "-c"]
COPY --from=build /app/ ./
COPY --from=build /whisper/whisper.cpp/main ./whisper.cpp/
COPY --from=build /whisper/whisper.cpp/models ./whisper.cpp/models
RUN rm -rf ./whisper.cpp/samples/*
RUN mkdir ./whisper.cpp/samples
RUN chmod +x ./wwbackend


EXPOSE 9090
CMD ["./wwbackend"]