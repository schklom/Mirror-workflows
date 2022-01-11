This branch does not mirror any repo. It just contains a Dockerfile needed to make an image that I want.

This branch contains a Dockerfile for `iperf3`.

By default, it runs `iperf3 -s` and makes an `iperf3` server listening on port 5201.

A basic usage with docker-compose is
```python
services:
  iperf3:
    image: schklom/iperf3
    ports:
      - 5201:5201
```

Overriding (to run it as a client for example) the command can be done via
`docker run -it --rm -p 5201:5201 schklom/iperf3 iperf3 -c some_server`

or
```python
services:
  iperf3:
    image: schklom/iperf3
    ports:
      - 5201:5201
    command: ["iperf3", "-c", "some_server"]
```



# Acknowledgements
This Dockerfile is heavily inspired by https://github.com/nerdalert/iperf3/blob/master/Dockerfile
