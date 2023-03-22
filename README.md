# FindMyDeviceServer

This server is able to communicate with FMD and save the latest location encrypted on it.


## Set up
### fmd server with docker
`docker-compose.yml`
```yml
version: '3.3'
services:
    fmd:
        image: registry.gitlab.com/nulide/findmydeviceserver
        container_name: fmd
        ports:
         - 127.0.0.1:1020:1020
        volumes:
            - './data:/fmd/objectbox/'
        restart: unless-stopped
```
A folder named `./data`, owned by uid 1000 should exist before starting the container. Otherwise, you get a permission error.

The container does only list to localhost. You need to run a reverse proxy to access it from outside or you need to remove `127.0.0.1:` prefix from the port section of the `docker-composey.yml`

### reverse proxy
#### with Caddy
`Caddyfile`
```
fmd.example.com {
	reverse_proxy localhost:1020
}
```
Caddy will automatically create a Let's Encrypt certificate for you.
