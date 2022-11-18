FROM golang:bullseye

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
WORKDIR /app
RUN bash -c "apt update -y &> /dev/null"
RUN bash -c "apt install -y ffmpeg &> /dev/null"

EXPOSE 9090
CMD ["./wwbackend"]