# FMD Server

This is the official server for [FMD Android](https://gitlab.com/fmd-foss/fmd-android)
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
./fmd-server serve
```

Alternatively, or if you are new to hosting applications,
we recommend to run FMD Server with Docker.

Quickly try FMD Server on your laptop from the command line:

```bash
docker run --rm -p 8080:8080 registry.gitlab.com/fmd-foss/fmd-server:v0.11.0
```

You can now visit FMD Server's web interface in your browser at http://localhost:8080.
You can register you FMD app using the server URL `http://<your-laptops-ip>:8080`.

Note that these steps are only for quick on-laptop testing and NOT for production!

⚠️ In particular, the web interface will only work over HTTP on localhost.
On all other origins **the web interface only works over HTTPS**.
(This is a requirement of the WebCrypto API.
FMD Server's API (and hence the app) always works over HTTP - but this is highly discouraged in production.)

## Paths

FMD Server uses the following paths:

|                                    | Default location | Recommended location         |
|------------------------------------|------------------|------------------------------|
| Config file                        | `./config.yml`   | `/etc/fmd-server/config.yml` |
| Directory with the SQLite database | `./db/`          | `/var/lib/fmd-server/db/`    |
| Directory with web static files    | `""` (embedded)  | `/usr/share/fmd-server/web/` |

These can be configured via CLI flags.
The directories can also be configured in the config file.

The default location is the current working directory, because it is expected to be writable by the current user.

When installing FMD Server as an admin, use the recommended locations for a more Unix-like setup.
However, this requires root privileges to create and chown the required locations (hence it is not the default).

The Dockerfile uses the recommended locations, so mount your volumes there (as shown below).

### Config file and packaging

When `/etc/fmd-server/config.yml` is present and used, FMD Server also reads in `/etc/fmd-server/local.yml`.

This is similar to how fail2ban uses jail.conf and jail.local:
it allows packagers to use config.yml and allows admins put their settings in local.yml.
Thus admins don't have to edit the packager's config.yml (which would
cause conflicts if a package update changes the config.yml).

Values in local.yml override their counterpart in config.yml.

## Self-hosting with Docker

> ⚠️ FMD Server is still pre-1.0. Therefore, minor versions can introduce breaking changes.
> It is recommended to pin a version and read [the changelog](https://gitlab.com/fmd-foss/fmd-server/-/releases)
> before upgrading.

The following is an (incomplete) example `docker-compose.yml` for deploying FMD Server with Docker Compose.

```yml
services:
    fmd:
        # Use the prebuilt image
        image: registry.gitlab.com/fmd-foss/fmd-server:v0.11.0
        # Or build the image yourself
        # build: https://gitlab.com/fmd-foss/fmd-server.git#v0.11.0
        container_name: fmd
        ports:
         - 127.0.0.1:8080:8080
        volumes:
            - './fmddata/db/:/var/lib/fmd-server/db/'
        restart: unless-stopped
```

Replace the version with the [latest release](https://gitlab.com/fmd-foss/fmd-server/-/releases).

*Persisting storage:*
FMD has a database and needs to persist it across container restarts.
You need to mount a Docker volume to the directory `/var/lib/fmd-server/db/` (inside the container).
**It must be readable and writable by uid 1000** (ideally it is owned by uid 1000).

*Networking:*
FMD Server listens for HTTP connections on port 8080.
This example has a port mapping from "127.0.0.1:8080" (on the host) to port 8080 (inside the container).
You need to set up your own reverse proxy.
The reverse proxy should terminate TLS and forward connections to the FMD container.
Instead of the port binding you can also use Docker networks (e.g. to connect your proxy container to the FMD container).

Run with `docker compose up --build --detach`.

## Container hardening

It is recommended to harden your Docker containers as decribed by [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html).
This means:

- Run a [read-only container](https://blog.ploetzli.ch/2025/docker-best-practices-read-only-containers/).
  - The only path that FMD Server writes to is the database directory, which should be mounted as a volume.
- Drop all capabilities.
- Disallow acquiring new privileges.

On the Docker CLI, pass:

```sh
docker run --read-only --cap-drop=all --security-opt=no-new-privileges # ... rest of command
```

In Docker Compose, set:

```yml
services:
    fmd:
        # other lines omitted
        read_only: true
        cap_drop: [ALL]
        security_opt: [no-new-privileges]
```

## Reverse Proxy

### With Caddy

Use the following Caddyfile:

```
fmd.example.com {
	reverse_proxy localhost:8080
}
```

Caddy will automatically obtain a certificate from Let's Encrypt for you.

### With nginx

See the [example nginx config](nginx-example.conf).

When uploading pictures you might see HTTP 413 errors in your proxy logs ("Content Too Large").
To fix this increase the maximum body size, e.g to 20 MB:

```
client_max_body_size 20m;
```

### Hosting in a subdirectory

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
    - ./server.crt:/etc/fmd-server/server.crt:ro
    - ./server.key:/etc/fmd-server/server.key:ro
```

## Configuring FMD Server

### Via config file

The [`config.example.yml`](config.example.yml) contains the available options to configure FMD Server.
Copy this file to `config.yml` and edit it to your liking.

By default, FMD Server will look for the `config.yml` at `/etc/fmd-server/config.yml`
and in the current working directory.
You can pass a custom location with `--config`.

With Docker you can mount it with `-v ./config.yml:/etc/fmd-server/config.yml:ro` (for CLI)
or for Compose:

```yml
# other lines omitted
volumes:
    - ./config.yml:/etc/fmd-server/config.yml:ro
```

NOTE: `yml` not `yaml`!

### Via environment variables

All values that can be set in the config file can also be set via environment variables.
Simply set `FMD_CONFIGFIELDNAME`, e.g. `FMD_PORTINSECURE`.

```yml
services:
  fmd:
    environment:
      FMD_PORTINSECURE: 8888
    # other lines omitted
```

### Via CLI flags

Some values can also be set via CLI flags.
See `fmd-server serve --help` for details.

### Precedence

FMD Server uses [Viper](https://github.com/spf13/viper), which has the following precedence rules
(from highest to lowest):

CLI flag > env var > config file value > default value

## Web static files

The static files for the website are included in the Go binary using [`go:embed`](https://pkg.go.dev/embed).
This is the recommended way to use FMD Server.

If you want to manually provide the `web/` directory (for example, for custom styling), you can provide a custom path with the `--web-dir` option.
This disables the embedded static files and instead reads all static files from the provided path.

## Other ways to install

- [AUR package](https://aur.archlinux.org/packages/findmydeviceserver), maintained by @Chris__

## Other Implementations

The community has developed the following alternative servers:

- [FindMyDeviceServerPHP](https://gitlab.com/Playit3110/FindMyDeviceServerPHP)
- [Django Find My Device](https://gitlab.com/jedie/django-find-my-device)

The community has developed the following alternative clients:

- [JavaScript](https://github.com/AirplanegoBrr/fmd-js-api)
- [Python](https://github.com/kinkerl/findmydevice_python)

**These implementations are unofficial, and are not audited by the FMD authors.**
Links are provided for your convenience only.
Use at your own risk.

## Logs

Logs are written to stderr and to syslog.

To view the messages in syslog:

```sh
journalctl -t fmd-server
less /var/log/syslog | grep fmd-server
```

## Donate

<script src="https://liberapay.com/Nulide/widgets/button.js"></script>
<noscript><a href="https://liberapay.com/Nulide/donate"><img alt="Donate using Liberapay" src="https://liberapay.com/assets/widgets/donate.svg"></a></noscript>

<a href='https://ko-fi.com/H2H35JLOY' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://cdn.ko-fi.com/cdn/kofi4.png?v=2' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>

## Funding

<div style="display: inline-flex; align-items: center;">
    <a href="https://nlnet.nl/" target="_blank">
        <img src="https://nlnet.nl/logo/banner.svg" alt="nlnet" height="50">
    </a>
    <a href="https://nlnet.nl/taler" target="_blank">
        <img src="https://nlnet.nl/image/logos/NGI_Mobifree_tag.svg" alt="NextGenerationInternet" height="50">
    </a>
</div>

This project was funded through the NGI Mobifree Fund.
For more details, visit our [project page](https://nlnet.nl/project/FMD/)

## License

FMD Server is published under [GPLv3-or-later](LICENSE).
