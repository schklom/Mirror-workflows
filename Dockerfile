FROM golang:1.26.3-alpine

COPY . .
WORKDIR web/
RUN go mod download
RUN go build -o simplytranslate
CMD [ "./simplytranslate" ]
