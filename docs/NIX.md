# openGym on NixOS — Flake & NixOS Module

openGym can run natively on NixOS through its **Nix flake** and **NixOS module** — no Docker, no
`docker compose`. The flake builds every openGym component (frontend, API, MCP server, exercise
media) as reproducible Nix packages; the module declares the whole stack as systemd services
managed by your NixOS configuration. This document covers both.

## 1. Technical introduction

### What the flake provides

`flake.nix` (inputs: `nixpkgs` on `nixos-unstable`, `flake-utils`) exposes, per supported system:

| Output | What it is |
| --- | --- |
| `packages.opengym-frontend` | The React/Vite PWA, built with `buildNpmPackage`. Static files land in `$out/share/opengym`. |
| `packages.opengym-api` | The Node.js API (`node server.js`, wrapped as `bin/opengym-api`). |
| `packages.opengym-mcp` | The read-only MCP server for LLM clients (`bin/opengym-mcp`). |
| `packages.opengym-media` | The exercise image/GIF dataset, pinned via `fetchFromGitHub`. Only fetched when `media.fetchAtBuild = true`. |
| `packages.opengym-fetch-media` | A shell script that clones the dataset at **runtime** (used by default). |
| `packages.default` | Alias for `opengym-frontend`. |
| `apps.opengym` | Runs the **full local stack** — API + frontend + pinned media behind a throwaway Caddy (`nix run .#opengym`, default `http://localhost:8080`). |
| `apps.default` | Alias for `opengym`. |
| `devShells.default` | Development shell: Node.js 22, coreutils, git. |
| `checks.nixos-module-eval` | Evaluates the module against a smoke-test config and asserts the resulting services/users/nginx state and extra environment. |
| `checks.opengym-nixos-test` *(Linux)* | Boots a NixOS VM and exercises the HTTP contract end to end (API health, nginx vhost proxy, SPA fallback). |
| `nixosTests.opengym` | The same VM test under the conventional `nixosTests` output. |
| `nixosModules.opengym` | The NixOS module (`nixosModules.default` aliases it). |

### What the NixOS module does

`services.opengym.enable = true` manages, purely declaratively:

- a system `opengym` user/group and the data directory (`/var/lib/opengym` by default),
- `systemd.services.opengym-api` — a **hardened** API unit (see [Systemd hardening](#systemd-hardening)),
- `systemd.services.opengym-media` — a one-shot media downloader (only in runtime-media mode),
- `systemd.services.opengym-mcp` — the MCP server, **only if `mcp.enable` is set**,
- read-only options exposing the built frontend and media directories so *your* web server can
  serve them (or `nginx.enable = true` for the module to manage one — see §4),
- `environment` / `environmentFile` — escape hatches to pass extra environment variables to the
  API (for variables openGym doesn't know about yet). See [Module options reference](#6-module-options-reference).

The module **does not own a web server by default**: it hands you the `web.root`, `media.imageRoot`
and `media.gifRoot` store paths to wire into your own reverse proxy (Caddy, nginx, Traefik, …).
openGym needs everything on **one origin** (passkeys require it), and NixOS deployments already run
a proxy — so the module integrates openGym into *yours* instead of re-implementing a web server
itself. See §4. If you'd rather have openGym's web server managed for you, set
`services.opengym.nginx.enable = true` and the module configures an nginx virtualHost for openGym
(only then is `services.nginx` enabled; on the Caddy-native default it is force-disabled).

### Configuration flow

```text
browser ── HTTPS ──▶ your web server (Caddy / nginx / …)         everything on ONE origin
                     ├─ /         → web.root            (built SPA, SPA fallback to /index.html)
                     ├─ /api/*    → opengym-api          (systemd, hardened, :3000 internally)
                     ├─ /img/*    → media.imageRoot       (exercise images)
                     └─ /gif/*    → media.gifRoot         (exercise GIFs)
                                                    │
                              opengym-api ──reads/writes──▶ dataDir (/var/lib/opengym)
```

## 2. Repository layout

```text
flake.nix              Flake entry point — packages, apps, devShell, module alias
nix/
  opengym.nix          The NixOS module (options + systemd/nginx wiring)
  frontend.nix         buildNpmPackage → $out/share/opengym
  api.nix              buildNpmPackage → bin/opengym-api
  mcp.nix              buildNpmPackage → bin/opengym-mcp
  media.nix            fetchFromGitHub pin of the exercise dataset (build-time)
  media-script.nix     runtime media-fetch shell script
  version.nix          version = "1.2.11" + pinned dataset commit (single source of truth)
  default.nix          package-set aggregator (used by both the flake and the module)
```

## 3. Building and using the packages

Requirements: Nix with flakes enabled (`nix.conf`: `experimental-features = nix-command flakes`).

```bash
# from a checkout of the repo
nix build .#opengym-frontend         # static site → result/share/opengym
nix build .#opengym-api              # API → result/bin/opengym-api
nix build .#opengym-mcp
nix run .#opengym                    # full local stack on http://localhost:8080 (see below)
nix develop                          # dev shell: nodejs_22, git, coreutils
nix flake check                      # eval check + (on Linux) the VM integration test
nix build .#nixosTests.opengym       # run just the VM integration test
```

`nix run .#opengym` starts the API, the built frontend and the pinned media behind a throwaway
Caddy — open `http://localhost:8080` and use it (passkeys work on `localhost`). Overrides via env
vars: `OPENGYM_DATA_DIR` (default `/tmp/opengym-data`), `OPENGYM_API_PORT` (3000),
`OPENGYM_WEB_PORT` (8080), `OPENGYM_RP_ID`/`OPENGYM_ORIGIN` (local defaults). Bear in mind the API
and frontend ports are just defaults — like any local dev server, don't point it at the internet.

For development, `nix develop` drops you into a shell with everything except `node_modules`;
inside it, the standard flow applies:

```bash
cd frontend && npm install && npm run dev     # Vite dev server on :5173, proxies /api to :3000
cd api && npm install && node server.js       # API on :3000
cd mcp && npm test                            # MCP server tests
```

## 4. Serving the app

The module creates the services but never serves HTTP itself. Point your existing reverse proxy —
always on a **single origin** — at the store paths the module exposes:

| Read-only option | Value | Contains |
| --- | --- | --- |
| `config.services.opengym.web.root` | `…-opengym-frontend/share/opengym` | the built SPA |
| `config.services.opengym.media.imageRoot` | `…/opengym-media/images` (build) **or** `…/media/img` (runtime) | `.jpg` images |
| `config.services.opengym.media.gifRoot` | `…/opengym-media/videos` (build) **or** `…/media/gif` (runtime) | `.gif` animations |

The URL contract the frontend expects ([`frontend/src/lib/exercises.js`](../frontend/src/lib/exercises.js)):

| URL path | Served from | Notes |
| --- | --- | --- |
| `/` | `web.root` | SPA — any unknown path falls back to `/index.html` |
| `/api/*` | `opengym-api` (the `apiPort` you configured) | reverse proxy, keep `/api` on the URL |
| `/img/*` | `media.imageRoot` | strip the `/img/` prefix |
| `/gif/*` | `media.gifRoot` | strip the `/gif/` prefix |

### Caddy

The idiomatic NixOS pairing (Caddy terminates TLS, gets automatic certs). Put this in a NixOS
module (where `config` is in scope) so the store paths resolve from the module's read-only options:

```nix
{
  services.caddy = {
    enable = true;
    virtualHosts."gym.example.com" = {
      extraConfig = ''
        encode zstd gzip

        handle /api/* {
          reverse_proxy 127.0.0.1:${toString config.services.opengym.apiPort}
        }
        handle_path /img/* {
          root * ${config.services.opengym.media.imageRoot}
          file_server
        }
        handle_path /gif/* {
          root * ${config.services.opengym.media.gifRoot}
          file_server
        }
        handle {
          root * ${config.services.opengym.web.root}
          try_files {path} /index.html
          file_server
        }
      '';
    };
  };
}
```

`handle_path` strips the matched prefix, so `/gif/bench.gif` resolves to
`${gifRoot}/bench.gif`. The API must **keep** its `/api` prefix (openGym routes on it), so `/api`
uses a plain `handle` that passes the full URI through. Order matters: `/api`, `/img` and `/gif`
must be handled before the catch-all `handle` that serves the SPA.

### nginx

Two ways to use nginx. If you don't already run an nginx config you care about, let the module
manage one:

```nix
{
  services.opengym = {
    enable = true;
    rpId   = "gym.example.com";
    origin = "https://gym.example.com";
    nginx = {
      enable = true;              # module writes the virtualHost below for you
      # hostName   = "gym.example.com";   # defaults to rpId
      # enableACME = true;                # Let's Encrypt + force TLS (requires security.acme.acceptTerms = true)
    };
  };
  security.acme.acceptTerms = true;       # only needed with enableACME = true
}
```

That renders a `services.nginx.virtualHosts."gym.example.com"` with the SPA root + fallback, the
`/api` proxy, `/img` and `/gif` aliases, gzip/optimisation settings, and — when `enableACME` — TLS.
It's ordinary `services.nginx` config afterwards, so you can still extend the vhost or add your own
virtualHosts alongside it.

Note: on the Caddy-native default the module force-disables `services.nginx`, so the way to turn
nginx on (and the only supported one, since the force-off is `mkForce`) is `nginx.enable = true`.

### Passkey constraint (read before choosing a hostname)

WebAuthn passkeys are bound to an exact hostname and require HTTPS. Configure the module with the
name that appears in the browser's address bar, not a container name or internal port:

```nix
services.opengym = {
  rpId   = "gym.example.com";            # bare hostname — no https://, no port
  origin = "https://gym.example.com";    # full origin — scheme, no trailing slash
};
```

Changing `rpId` later invalidates every registered passkey. On a LAN without certificates,
plain `http://<ip>` can't do passkeys — use guest mode or put a certificate in front of it.
The full `RP_ID`/`ORIGIN` troubleshooting guide in
[`docs/SELF_HOSTING.md`](SELF_HOSTING.md#passkeys-fail-even-though-rpid-looks-right) applies
word-for-word.

## 5. Using the NixOS module

### Add the flake as an input

```nix
# flake.nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    opengym.url = "git+https://gitlab.com/DuarteSantos8/opengym";
  };

  outputs = { self, nixpkgs, opengym, ... }: {
    nixosConfigurations.myhost = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        opengym.nixosModules.default
        ./configuration.nix
      ];
    };
  };
}
```

Then `sudo nixos-rebuild switch --flake .#myhost`.

Not using flakes in your NixOS config? You can also `imports` the module file directly from a
checkout of the repo:

```nix
{ imports = [ "/path/to/opengym/nix/opengym.nix" ]; }
```

#### Package provenance

When you load the module *through the flake* (`opengym.nixosModules.default`), the default
`services.opengym.package` set is the one built by this flake — from the flake's **locked**
`nixpkgs` input. Importing `nix/opengym.nix` directly instead falls back to building the packages
from *your system's* nixpkgs, which may differ slightly. If you ever need a specific set, override
`services.opengym.package` explicitly (e.g. `opengym.packages.x86_64-linux` from your flake inputs).

### Minimal enable (works on `localhost`)

```nix
{
  services.opengym = {
    enable = true;
    rpId = "localhost";
    origin = "http://localhost:8080";
  };
}
```

This gives you the `opengym` system user, `/var/lib/opengym` (created via `StateDirectory` +
tmpfiles — the default `dataDir`), the `opengym-api` service listening on `:3000`, and — since
`media.fetchAtBuild` defaults to `false` — the `opengym-media` one-shot that downloads the exercise
dataset (~140 MB, once) into `/var/lib/opengym/media`. Pair it with the Caddy or nginx config from
§4 pointing at the exposed roots.

### A realistic production example

```nix
{
  services.opengym = {
    enable = true;

    rpId   = "gym.example.com";
    origin = "https://gym.example.com";
    rpName = "My gym";

    adminUids  = "u-abc123";          # comma-separated; gets the admin dashboard
    inviteOnly = true;                # new signups need an invite code
    allowGuest = false;               # remove "Continue without account"

    auditLog = true;
    auditIp  = "net";                 # record masked network address only

    media = {
      fetchAtBuild = true;            # bake media into the Nix store instead of runtime download
    };

    mcp.enable = false;               # off unless you use an LLM client
  };

  security.acme.acceptTerms = true;
  services.caddy.enable = true;       # or configure nginx as in §4
}
```

### Extra environment variables

openGym's server is env-var driven, so from time to time a new variable reaches the project
before the module grows an option for it. Two options cover the gap — and they are **mutually
exclusive** (setting both is an evaluation error):

```nix
# Per-variable, declared in Nix:
services.opengym = {
  enable = true;
  environment = {
    NEW_FLAG = "1";          # anything the module doesn't already manage
  };
};
```

```nix
# From an existing env file (KEY=VALUE per line), e.g. generated by sops-nix or a tmpfiles rule:
services.opengym = {
  enable = true;
  environmentFile = "/run/opengym/env";
};
```

Both apply to the `opengym-api` systemd unit only; the module's own options take precedence on a
name collision (and for `environmentFile`, systemd applies the file after the declarative
variables, so entries there can still override).

### What enabling the module creates

| Piece | When | Details |
| --- | --- | --- |
| `users.users.opengym`, `users.groups.opengym` | always | system user/group |
| tmpfiles rules | always | `dataDir` (`0750`), `media.dataDir` (`0755`) |
| `systemd.services.opengym-api` | always | `Restart=on-failure`, runs as `opengym`, hardened |
| `systemd.services.opengym-media` | only when `media.fetchAtBuild = false` | one-shot (`Type=oneshot`, `RemainAfterExit`) media downloader |
| `systemd.services.opengym-mcp` | only when `mcp.enable = true` | stdio bridge, runs as `opengym`, same sandbox as the API |
| `services.nginx` vhost | only when `nginx.enable = true` | managed virtualHost (SPA + `/api` + `/img` + `/gif`) |
| `services.nginx.enable = false` | only when `nginx.enable = false` | force-disabled — bring your own web server |

<span id="systemd-hardening"></span>
The API unit is restricted: `ProtectSystem=strict`, `ProtectHome`, `PrivateTmp`,
`PrivateDevices`, `ProtectKernelTunables/Modules/ControlGroups`, `RestrictNamespaces`,
`RestrictSUIDSGID`, `NoNewPrivileges`, `LockPersonality`, a system-call allowlist
(`@system-service`, `~@privileged`), and `ReadWritePaths` limited to `dataDir` — the API can only
write to your data directory. The MCP unit is a **stdio bridge that only reads** the same files, so
it runs under the exact same sandbox (plus `StandardInput=null` / `StandardOutput=journal`, since a
systemd-spawned MCP server has no client on stdin).

## 6. Module options reference

All options live under `services.opengym`. Options marked *(read-only)* are computed by the module
for other modules to consume — setting them yourself is an error.

### Top-level options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `enable` | `bool` | `false` | Enable openGym (user, services, directories). |
| `package` | `attrsOf package` | packages built from source | The package set: `{ opengym-frontend, opengym-api, opengym-mcp, opengym-media, opengym-fetch-media }`. Override to serve pre-built binaries (e.g. from a cache). |
| `dataDir` | `path` | `/var/lib/opengym` | Persistent data directory — `db.json`, per-user `state-<uid>.json`, `secret`, `vapid.json`, `audit.log`. With the default `/var/lib/opengym`, systemd's `StateDirectory` creates (and cleans up) it; a custom path is created by a tmpfiles rule and `ReadWritePaths` points at it instead. |
| `apiPort` | `port` | `3000` | Port the API listens on (internal — reachable via your reverse proxy, front it yourself if you open the firewall). |
| `rpId` | `str` | `localhost` | WebAuthn Relying Party ID. Bare hostname, must match the address bar exactly. |
| `origin` | `str` | `http://localhost:8080` | Full origin for CSRF validation. Must match the address bar exactly (scheme + host, no trailing slash). |
| `rpName` | `str` | `openGym` | Display name shown when the browser prompts for a passkey. |
| `sessionDays` | `ints.unsigned` | `90` | Session cookie lifetime, in days. |
| `adminUids` | `str` | `""` | Comma-separated user IDs granted the admin dashboard. Empty = no admin. |
| `inviteOnly` | `bool` | `false` | Require an invite code to create a new profile. |
| `allowGuest` | `bool` | `true` | Offer "Continue without account" (guest mode — never touches the server). Set `false` to remove the button. |
| `auditLog` | `bool` | `true` | Record sign-ins, signouts, failed attempts and admin actions to `audit.log`. |
| `auditMax` | `ints.unsigned` | `5000` | Max audit events kept (`0` = unlimited). |
| `auditDays` | `ints.unsigned` | `90` | Max days of audit events kept. |
| `auditIp` | `enum ["off" "net" "full"]` | `"off"` | IP recording mode: `off` (none), `net` (network only, e.g. `203.0.113.0/24`), `full`. |
| `vapidSubject` | `str` | `""` | Contact URL sent with web-push requests (e.g. `mailto:you@example.com`). Empty = the `origin` is sent. |
| `environment` | `attrsOf str` | `{ }` | Extra environment variables set on the `opengym-api` unit — the escape hatch for variables the module doesn't manage yet (newly added to the project). On a conflict with a variable the module derives from its own options, the module's value wins. Mutually exclusive with `environmentFile`. |
| `environmentFile` | `str` | `""` | Path to an env file (`KEY=VALUE` per line) read by the `opengym-api` unit via systemd `EnvironmentFile=`. systemd applies it *after* the declarative environment, so entries in the file may override module-managed variables. Mutually exclusive with `environment`. |

### `nginx.*` suboptions

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `nginx.enable` | `bool` | `false` | Have the module configure an nginx virtualHost for openGym via `services.nginx` (SPA root + fallback, `/api` proxy, `/img` + `/gif` aliases, gzip/optimisation). When `false` (Caddy-native default) the module force-disables `services.nginx`. |
| `nginx.hostName` | `str` | `"${rpId}"` | Server name the virtualHost listens on. |
| `nginx.enableACME` | `bool` | `false` | Serve over TLS: `enableACME` + `forceSSL` on the vhost. Requires `security.acme.acceptTerms = true`. |

### `media.*` suboptions

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `media.fetchAtBuild` | `bool` | `false` | Fetch the exercise dataset **at build time** into the Nix store (pinned, offline-capable). `false` = fetch at runtime with the `opengym-media` one-shot. |
| `media.dataDir` | `path` | `"${dataDir}/media"` | Directory for runtime-fetched media (`img/` + `gif/` inside). |
| `media.imageRoot` *(read-only)* | `path` | — | Directory of `.jpg` images. `…/opengym-media/images` when `fetchAtBuild`, else `…/media/img`. Serve at `/img/`. |
| `media.gifRoot` *(read-only)* | `path` | — | Directory of `.gif` animations. `…/opengym-media/videos` when `fetchAtBuild`, else `…/media/gif`. Serve at `/gif/`. |

### `web.*` suboptions

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `web.root` *(read-only)* | `path` | — | Built frontend directory (`…/opengym-frontend/share/opengym`). Serve as the SPA root with a fallback to `/index.html`. |

### `mcp.*` suboptions

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `mcp.enable` | `bool` | `false` | Run the read-only MCP server as a systemd service (reads the same `dataDir`). Off unless you point an LLM client at it. |

### Option → environment mapping

The module renders these into the `opengym-api` systemd unit as environment variables — useful if
you are cross-referencing the Docker/`.env` contract:

| Option | Env var | Option | Env var |
| --- | --- | --- | --- |
| `apiPort` | `PORT` | `auditLog` | `AUDIT_LOG` (`1`/`0`) |
| `dataDir` | `DATA_DIR` | `auditMax` | `AUDIT_MAX` |
| `rpId` | `RP_ID` | `auditDays` | `AUDIT_DAYS` |
| `origin` | `ORIGIN` | `auditIp` | `AUDIT_IP` |
| `rpName` | `RP_NAME` | `vapidSubject` | `VAPID_SUBJECT` (set only when non-empty) |
| `sessionDays` | `SESSION_DAYS` | `adminUids` | `ADMIN_UIDS` (set only when non-empty) |
| `allowGuest` | `ALLOW_GUEST` (`1`/`0`) | `inviteOnly` | `INVITE_ONLY` (`1`/`0`) |

`environment` and `environmentFile` are raw passthrough and don't appear here — they end up on the
unit exactly as you write them (see [Extra environment variables](#extra-environment-variables)).

## 7. Data, backups and updates

**Everything** lives under `dataDir` (`/var/lib/opengym`): `db.json` (profiles + public passkeys),
`state-<uid>.json` (each user's plan, workouts, body weight, settings), `secret` (session-cookie
key), `vapid.json` (push keys), and `audit.log`. Passkey private keys never reach the server.

```bash
sudo tar czf opengym-backup-$(date +%F).tar.gz /var/lib/opengym
```

Restore by unpacking it back; nothing else needs reconfiguring.

Updating is a normal flake workflow:

```bash
nix flake update opengym
sudo nixos-rebuild switch --flake .#myhost
```

Your data and the runtime media directory are untouched. Changing `rpId`/`origin` is *not* a
routine update — see the passkey caveat in §4.

## 8. Troubleshooting

| Symptom | Fix |
| --- | --- |
| No passkey prompt / "verification failed" | `rpId`/`origin` don't match the address bar. Ask the server what it loaded: `journalctl -u opengym-api -b \| grep 'gym-api on'`.  See §4 and `docs/SELF_HOSTING.md`. |
| App loads but exercises show no image/animation | The `/img` and `/gif` routes aren't mapped to `imageRoot`/`gifRoot` in your web server, or runtime media hasn't downloaded yet — check `systemctl status opengym-media` / `journalctl -u opengym-media`. |
| `/api` returns 502/404 | Your proxy's `apiPort` (`services.opengym.apiPort`) differs from what `reverse_proxy`/`proxy_pass` targets. |
| `nginx` is silently gone after enabling the module | Expected on the Caddy-native default (`nginx.enable = false`): the module sets `services.nginx.enable = false`. Set `services.opengym.nginx.enable = true` to have the module configure nginx for openGym (or `lib.mkForce true` to manage it yourself). |
| Service won't start | `journalctl -u opengym-api -xe`. Common: custom `dataDir` not created/owned correctly (the tmpfiles rule should handle it; check `systemd-tmpfiles --create`). |
| Eval fails: `environment and environmentFile are mutually exclusive` | Pick one. Set extra vars either as a Nix attrset (`environment`) or in a file (`environmentFile`), never both. |
| You expected a binary cache | The flake builds from source; override `services.opengym.package` (or `packages.*` via a cache/overlay) to substitute binaries. |
| Exercise media licensing | openGym ships none of it; it's fetched from [hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset) (third-party, ownership disputed). See [`NOTICE.md`](../NOTICE.md) |
| `nix run .#opengym` serves a blank site | The app now serves frontend + API + media behind a local Caddy. If something's off, check the log line it prints (ports/`DATA_DIR`) and that nothing else already binds `:3000`/`:8080` — pass `OPENGYM_API_PORT`/`OPENGYM_WEB_PORT` to move them. |

### Media modes in detail

- **`media.fetchAtBuild = true`** — the dataset is fetched once via `fetchFromGitHub` (pinned to
  the same commit the Docker build uses) and stored in the Nix store. `imageRoot`/`gifRoot` point
  into `/nix/store`. No `opengym-media` service is created. Ideal for air-gapped/immutable systems;
  you pay the ~140 MB fetch on every switch that rebuilds the media derivation.
- **`media.fetchAtBuild = false`** (default) — the `opengym-media` one-shot downloads the pinned
  dataset tarball (a GitHub `/archive/<rev>.tar.gz` of the **same commit** `media.nix` pins) on first
  boot into `media.dataDir`, then skips while files are present. `imageRoot`/`gifRoot` point under
  `dataDir`, so backups cover media too.

## See also

- [`docs/SELF_HOSTING.md`](SELF_HOSTING.md) — the general self-hosting guide (Docker but the domain,
  passkey and admin/audit details apply unchanged).
- [`docs/MOBILE.md`](MOBILE.md) — the stand-alone Android app, an alternative to self-hosting.
- [`docs/DATA_IMPORTS.md`](DATA_IMPORTS.md) — importing from FitNotes/Strong/Hevy/Apple Health.
- [`NOTICE.md`](../NOTICE.md) — third-party notices, including the exercise-media situation.
