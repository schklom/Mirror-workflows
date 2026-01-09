# FMD Server

This is the official server for [FMD Android](https://gitlab.com/fmd-foss/fmd-android)
written in Go.

The FMD app can register an account on FMD Server.
The app can then upload its location at regular intervals.
You can also push commands to the FMD app on your device from FMD Server,
e.g. to make your device ring.

## Running FMD Server

You can try FMD Server on your laptop with Docker.

```bash
docker run --rm -p 8080:8080 registry.gitlab.com/fmd-foss/fmd-server:0.13.0
```

You can now visit FMD Server's web interface in your browser at <http://localhost:8080>.
You can register you FMD app using the server URL `http://<your-laptops-ip>:8080`.

Note that these steps are only for quick on-laptop testing and NOT for production!

## Self-hosting

For self-hosting instructions, see the [installation guide](https://fmd-foss.org/docs/fmd-server/installation/overview).

## Community projects

See [this list](https://fmd-foss.org/docs/fmd-server/community) of community-maintained projects related to FMD Server.

## Building

FMD Server consists of two parts: a web frontend written in React and a Go backend.

You first need to compile the React app as a static site.
See the [web/README.md](web/README.md) for instructions on how to build the web app.

In a second step, compile the Go code into a static Go binary.
This binary is stand-alone, and includes both the frontend and the backend.
To build the Go app:

```bash
go run . serve
# or
go build
./fmd-server serve
```

## Donate

<script src="https://liberapay.com/FMD/widgets/button.js"></script>
<noscript><a href="https://liberapay.com/FMD/donate"><img alt="Donate using Liberapay" src="https://liberapay.com/assets/widgets/donate.svg"></a></noscript>

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
