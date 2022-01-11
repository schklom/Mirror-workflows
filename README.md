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
