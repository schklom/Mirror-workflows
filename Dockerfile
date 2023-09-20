FROM golang:1.20-alpine

RUN apk update && apk add git

RUN git clone https://codeberg.org/SimpleWeb/SimplyTranslate/
WORKDIR SimplyTranslate/web/
RUN go mod download
RUN go build -o simplytranslate
EXPOSE 5000

CMD [ "./simplytranslate" ]