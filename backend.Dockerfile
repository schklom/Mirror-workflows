FROM golang:bullseye AS build

WORKDIR /app
COPY backend/ ./
RUN go mod download
RUN go build -v -o wwbackend ./...
#
RUN rm -rf whisper.cpp
RUN bash -c "git clone https://github.com/ggerganov/whisper.cpp &> /dev/null"
WORKDIR /app/whisper.cpp

# Invalidate cache if repo has new commits so these are pulled
ADD https://api.github.com/repos/ggerganov/whisper.cpp/git/refs/heads/master /.git-hashref
RUN bash -c "git pull &> /dev/null"

ARG WHISPER_MODEL
ENV WHISPER_MODEL "$WHISPER_MODEL"
RUN bash -c  "models/download-ggml-model.sh $WHISPER_MODEL &> /dev/null"
RUN bash -c "make $WHISPER_MODEL &> /dev/null"
#

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
RUN chmod +x ./wwbackend


EXPOSE 9090
CMD ["./wwbackend"]