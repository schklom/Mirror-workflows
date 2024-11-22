# FMD Server

This is the official server for [FindMyDevice (FMD)](https://gitlab.com/Nulide/findmydevice)
written in Go.

The FMD app can register an account on FMD Server.
The app can then upload its location at regular intervals.
You can also push commands to the FMD app on your device from FMD Server,
e.g. to make your device ring.

## Running FMD Server

At its core, FMD is just a binary that you can run directly.
If you are experienced and have settled on your own way to deploy applications,
feel free to stick to that.

```bash
go run main.go serve
# or
go build
./findmydeviceserver serve
```

Alternatively, or if you are new to hosting applications,
we recommend to run FMD Server with Docker.

Quickly try FMD Server on your laptop from the command line:

```bash
docker run --rm -p 8080:8080 registry.gitlab.com/nulide/findmydeviceserver:v0.6.0
```

You can now visit FMD Server's web interface in your browser at http://localhost:8080.
You can register you FMD app using the server URL `http://<your-laptops-ip>:8080`.

Note that these steps are only for quick on-laptop testing and NOT for production!

⚠️ In particular, the web interface will only work over HTTP on localhost.
On all other origins **the web interface only works over HTTPS**.
(This is a requirement of the WebCrypto API.
FMD Server's API (and hence the app) always works over HTTP - but this is highly discouraged in production.)

### Self-hosting with Docker Compose

> ⚠️ FMD Server is still pre-1.0. Therefore, minor versions can introduce breaking changes.
> It is recommended to pin a version and read [the changelog](https://gitlab.com/Nulide/findmydeviceserver/-/releases)
> before upgrading.

The following is an (incomplete) example for deploying FMD Server with Docker Compose.

`docker-compose.yml`
```yml
services:
    fmd:
        # Use the prebuilt image
        image: registry.gitlab.com/nulide/findmydeviceserver:v0.8.0
        # Or build the image yourself
        # build: https://gitlab.com/Nulide/findmydeviceserver.git#v0.8.0
        container_name: fmd
        ports:
         - 127.0.0.1:8080:8080
        volumes:
            - './fmddata/db/:/fmd/db/'
        restart: unless-stopped
```

Replace the version with the [latest release](https://gitlab.com/Nulide/findmydeviceserver/-/releases).

*Persisting storage:*
FMD has a database and needs to persist it across container restarts.
You need to mount a Docker volume to the directory `/fmd/db/` (inside the container).
**It must be readable and writable by uid 1000** (ideally it is owned by uid 1000).

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

#### Hosting in a subdirectory

The FMD Server binary (whether run in Docker or not) assumes that request paths start at the root ("/").
That is, it assumes that you host FMD Server on a (sub-)domain, e.g., `https://fmd.example.com`.

If you host FMD Server in a subdirectory, e.g., `https://example.com/fmd/`, you need to configure
your proxy to strip the subdirectory before forwarding the request to the backend.
FMD Server does not know how to resolve `/fmd/api/`, it only knows about `/api/`.

### Without Reverse Proxy

> ⚠️ This setup is not recommended and provided for your convenience only.

If you don't want to use a reverse proxy, FMD Server can terminate TLS for you.
However, you need to manage (and regularly renew!) the certificates.

1. Get a TLS certificate for your domain.
1. Set the `ServerCrt` and `ServerKey` in the config file (see below).
1. Mount the certificate and the private key into the container:

```yml
# other lines omitted
volumes:
    - ./server.crt:/fmd/server.crt:ro
    - ./server.key:/fmd/server.key:ro
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


## Other ways to install

- [AUR package](https://aur.archlinux.org/packages/findmydeviceserver), maintained by @Chris__

## Other Implementations

The community has developed implementations of FMD Server in other languages/frameworks:

- [FindMyDeviceServerPHP](https://gitlab.com/Playit3110/FindMyDeviceServerPHP)
- [Django Find My Device](https://gitlab.com/jedie/django-find-my-device)

## Donate

<script src="https://liberapay.com/Nulide/widgets/button.js"></script>
<noscript><a href="https://liberapay.com/Nulide/donate"><img alt="Donate using Liberapay" src="https://liberapay.com/assets/widgets/donate.svg"></a></noscript>

<a href='https://ko-fi.com/H2H35JLOY' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://cdn.ko-fi.com/cdn/kofi4.png?v=2' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>

## License

FMD Server is published under [GPLv3-or-later](LICENSE).

