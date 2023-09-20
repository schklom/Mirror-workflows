FROM golang:1.20-alpine

WORKDIR web/
RUN go mod download
RUN go build -o simplytranslate
EXPOSE 5000
CMD [ "./simplytranslate" ]