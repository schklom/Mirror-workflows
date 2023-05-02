FROM golang:bullseye AS backend_builder
WORKDIR /app
# Build Go backend
COPY backend/ ./
RUN go build -v -o wwbackend ./...

FROM gcc:bullseye AS whisper_builder
# Get necessary Software
RUN rm -rf whisper.cpp
RUN apt remove -y wget
RUN apt install -y unzip curl
WORKDIR /whisper

# Get latest working whisper version
RUN bash -c "curl -L --output v1.4.1.zip https://github.com/ggerganov/whisper.cpp/archive/refs/tags/v1.4.1.zip"
RUN bash -c "unzip v1.4.1.zip &> /dev/null"
RUN mv whisper.cpp-1.4.1 whisper.cpp

# Get and make whisper.cpp models and binary
WORKDIR /whisper/whisper.cpp
ARG WHISPER_MODEL
ENV WHISPER_MODEL "$WHISPER_MODEL"
# Build model
RUN chmod +x models/*.sh
RUN bash -c  "models/download-ggml-model.sh $WHISPER_MODEL &> /dev/null"
RUN bash -c "make $WHISPER_MODEL &> /dev/null"

# Prepare working environment
FROM gcc:bullseye

ARG CUT_MEDIA_SECONDS
ENV CUT_MEDIA_SECONDS "$CUT_MEDIA_SECONDS"

ARG WHISPER_MODEL
ENV WHISPER_MODEL "$WHISPER_MODEL"

ARG KEEP_FILES
ENV KEEP_FILES "$KEEP_FILES"

ARG WHISPER_THREADS
ENV WHISPER_THREADS "$WHISPER_THREADS"

ARG DISABLE_LOCAL_WHISPER
ENV DISABLE_LOCAL_WHISPER "$DISABLE_LOCAL_WHISPER"

ARG WHISPER_PROCESSORS
ENV WHISPER_PROCESSORS "$WHISPER_PROCESSORS"

ARG OPENAI_TOKEN
ENV OPENAI_TOKEN "$OPENAI_TOKEN"

ARG ARCHITECTURE
ENV ARCHITECTURE "$ARCHITECTURE"

WORKDIR /app
# Get and install latest ffmpeg
RUN apt update && apt install -y xz-utils tar
RUN wget "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-${ARCHITECTURE}-static.tar.xz"
RUN tar xvf ffmpeg-release-amd64-static.tar.xz
RUN mv ffmpeg*/ffmpeg /bin/ffmpeg
RUN rm -rf ffmpeg*

# Get and install yt-dlp
RUN wget https://github.com/yt-dlp/yt-dlp/releases/download/2023.03.04/yt-dlp_linux
RUN mv yt-dlp_linux yt-dlp
RUN chmod +x yt-dlp
RUN mv yt-dlp /bin/yt-dlp

SHELL ["/bin/bash", "--login" , "-c"]

COPY --from=backend_builder /app/ ./
COPY --from=whisper_builder /whisper/whisper.cpp/main ./whisper.cpp/
COPY --from=whisper_builder /whisper/whisper.cpp/models ./whisper.cpp/models
RUN rm -rf ./whisper.cpp/samples/*
RUN chmod +x ./wwbackend

EXPOSE 9090
CMD ["./wwbackend"]