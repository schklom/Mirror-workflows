FROM golang:1.27-alpine

COPY . .
WORKDIR web/
RUN go mod download
RUN go build -o simplytranslate
CMD [ "./simplytranslate" ]
