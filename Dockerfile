FROM alpine

# install binary
RUN apk update
# https://stackoverflow.com/a/48281852
RUN apk add --no-cache iperf3

# By default, expose port 5201
EXPOSE 5201

CMD ["iperf3", "-s"]
