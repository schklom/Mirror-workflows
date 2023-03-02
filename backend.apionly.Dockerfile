
# Disabled is false
FROM golang:bullseye AS backend_builder
ARG DISABLE_LOCAL_WHISPER
ENV DISABLE_LOCAL_WHISPER "$DISABLE_LOCAL_WHISPER"
WORKDIR /app
# Build Go backend
COPY backend/ ./
RUN go build -v -o wwbackend ./...
RUN chmod +x ./wwbackend
EXPOSE 9090
CMD ["./wwbackend"]