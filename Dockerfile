FROM alpine

# install binary and remove cache
RUN apt-get update
RUN apt-get install -y iperf3
RUN rm -rf /var/lib/apt/lists/*

# By default, expose port 5201
EXPOSE 5201

ENTRYPOINT ["iperf3 -s"]
