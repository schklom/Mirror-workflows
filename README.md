# FMD Server

This is the official server for FMD ("Find My Device") written in Go.

The FMD app can register an account on FMD Server.
The app can then upload its location at regular intervals.
You can also push commands to the FMD app on your device from FMD Server,
e.g. to make your device ring.

## Running FMD Server

At its core, FMD is just a binary that you can run directly.
If you are experienced and have settled on your own way to deploy applications,
feel free to stick to that.

Alternatively, or if you are new to hosting applications,
we recommend to run FMD Server with Docker.

Quickly try FMD Server on your laptop from the command line:

```
docker build --tag fmd-git https://gitlab.com/Nulide/findmydeviceserver.git#v0.5.0
docker run --rm -p 8080:8080 fmd-git
```

You can now visit FMD Server's web interface in your browser at http://localhost:8080.
You can register you FMD app using the server URL `http://<your-laptops-ip>:8080`.

Note that these steps are only for quick on-laptop testing and NOT for production!

⚠️ In particular, the web interface will only work over HTTP on localhost.
On all other origins **the web interface only works over HTTPS**.
(This is a requirement of the WebCrypto API.
FMD Server's API (and hence the app) always works over HTTP - but this is highly discouraged in production.)

### Self-hosting with Docker Compose

The following is an (incomplete) example for deploying FMD Server with Docker Compose.

`docker-compose.yml`
```yml
version: '3'
services:
    fmd:
        build: https://gitlab.com/Nulide/findmydeviceserver.git#v0.5.0
        container_name: fmd
        ports:
         - 127.0.0.1:8080:8080
        volumes:
            - './data:/fmd/objectbox/'
        restart: unless-stopped
```

Replace the version with the [latest release](https://gitlab.com/Nulide/findmydeviceserver/-/releases).

*Persisting storage:*
FMD has a database and needs to persist it across container restarts.
You need to mount a Docker volume at `/fmd/objectbox/` inside the container.
It must be readable and writable by uid 1000 (ideally it is owned by uid 1000).
This example mounts a folder named `./data` (in the current directory outside the container).

*Networking:*
FMD Server listens for HTTP connections on port 8080.
This example has a port mapping from "127.0.0.1:8080" (on the host) to port 8080 (inside the container).
You need to set up your own reverse proxy.
The reverse proxy should terminate TLS and forward connections to the FMD container.
Instead of the port binding you can also use Docker networks (e.g. to connect your proxy container to the FMD container).

Run with `docker compose up --build --detach`.

### Reverse Proxy

#### With Caddy

`Caddyfile`
```
fmd.example.com {
	reverse_proxy localhost:8080
}
```
Caddy will automatically create a Let's Encrypt certificate for you.

#### With nginx

See the [example nginx config](nginx-example.conf).

When uploading pictures you might see HTTP 413 errors in your proxy logs ("Content Too Large").
To fix this increase the maximum body size, e.g to 20 MB:

```
client_max_body_size 20m;
```

## Configuring FMD Server

The [`config.example.yml`](config.example.yml) contains the available options to configure FMD Server.
Copy this file to `config.yml` and edit it to your liking.

The `config.yml` should be in the same directory as the binary.
With Docker you can mount it with `-v ./config.yml:/fmd/config.yml:ro` (for CLI)
or for Compose:

```yml
# other lines omitted
volumes:
    - ./config.yml:/fmd/config.yml:ro
```

NOTE: `yml` not `yaml`!

## Developing

A simple way to test code changes is to build a container image locally and run that:

```
docker build -t fmd-local .
docker run --rm -p 8080:8080 fmd-local
```

Alternatively, you can use `go build` directly and run the resulting binary,
but you will need to install objectbox and the node modules.

## Other Implementations

The community has developed implementations of FMD Server in other languages/frameworks:

- [FindMyDeviceServerPHP](https://gitlab.com/Playit3110/FindMyDeviceServerPHP)
- [Django Find My Device](https://gitlab.com/jedie/django-find-my-device)

## License

FMD Server is published under [GPLv3-or-later](LICENSE).

