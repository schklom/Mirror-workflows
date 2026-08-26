# Nix Flake + NixOS Module for openGym

## Goal

Package openGym as a Nix flake with:

- Reproducible Nix packages for frontend, API, MCP, and media
- A pure NixOS module (`services.opengym`) that declaratively manages the full stack
- A devShell for local development
- A runnable `app` for quick local testing

## File Structure

```text
flake.nix                          # Flake entry point
nix/
  default.nix                      # Package set aggregator
  frontend.nix                     # buildNpmPackage for frontend/
  api.nix                          # buildNpmPackage for api/
  mcp.nix                          # buildNpmPackage for mcp/
  media.nix                        # Exercise media (fetchFromGitHub, build-time)
  media-script.nix                 # Runtime fetch script (git clone on first boot)
  opengym.nix                      # NixOS module definition
```

No other existing files are modified (except adding `.nix` to `.gitignore` patterns
if needed — but `*.nix` should be tracked, only `result` is gitignored).

---

## 1. `nix/frontend.nix` — Frontend Package

Uses `buildNpmPackage` to build the Vite/React SPA.

```nix
{ lib, buildNpmPackage, nodejs_22 }:

buildNpmPackage rec {
  pname = "opengym-frontend";
  version = "1.2.11";
  src = ./..;  # repo root (needs frontend/ inside)

  sourceRoot = "${src.name}/frontend";

  nodejs = nodejs_22;

  npmDepsHash = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";  # compute with prefetch-npm-deps

  npmBuildScript = "build";

  # Vite needs these at build time; empty/defaults are fine for production
  env.NODE_ENV = "production";

  installPhase = ''
    runHook preInstall
    mkdir -p $out/share/opengym
    cp -r dist/* $out/share/opengym/
    runHook postInstall
  '';

  meta = with lib; {
    description = "openGym frontend — self-hosted gym & body-weight tracker PWA";
    license = licenses.agpl3Plus;
    platforms = nodejs.meta.platforms;
  };
}
```

**Key decisions:**

- `sourceRoot` points to `frontend/` within the repo checkout so npm runs in the right directory.
- Output is static files under `$out/share/opengym/` — nginx serves from here.
- `npmDepsHash` is computed once via `prefetch-npm-deps` and updated when `package-lock.json` changes.
- No `VITE_*` build-time vars needed for the default build (analytics off, CDN media off).

---

## 2. `nix/api.nix` — API Package

Uses `buildNpmPackage` to install the Node.js API with its 2 production dependencies.

```nix
{ lib, buildNpmPackage, nodejs_22, makeWrapper }:

buildNpmPackage rec {
  pname = "opengym-api";
  version = "1.2.11";
  src = ./..;

  sourceRoot = "${src.name}/api";

  nodejs = nodejs_22;

  npmDepsHash = "sha256-BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=";

  npmBuildScript = "start";  # or dontNpmBuild = true; and manual install

  nativeBuildInputs = [ makeWrapper ];

  # Don't run "npm run start" during build — just install deps + copy files
  dontNpmBuild = true;

  installPhase = ''
    runHook preInstall
    mkdir -p $out/lib/opengym-api
    cp -r node_modules $out/lib/opengym-api/
    cp server.js push-messages.js verify-error.js $out/lib/opengym-api/

    mkdir -p $out/bin
    makeWrapper ${nodejs_22}/bin/node $out/bin/opengym-api \
      --add-flags "$out/lib/opengym-api/server.js" \
      --set NODE_ENV production
    runHook postInstall
  '';

  meta = with lib; {
    description = "openGym API — passkey auth + per-user workout data (Node.js)";
    license = licenses.agpl3Plus;
    platforms = nodejs.meta.platforms;
  };
}
```

**Key decisions:**

- `dontNpmBuild = true` — the API has no build step (pure JS). We just install deps and copy source.
- `makeWrapper` creates `bin/opengym-api` that runs `node server.js` with `NODE_ENV=production`.
- The `DATA_DIR`, `PORT`, and other env vars are set by the NixOS module via systemd `Environment=`.

---

## 3. `nix/mcp.nix` — MCP Server Package

Same pattern as the API.

```nix
{ lib, buildNpmPackage, nodejs_22, makeWrapper }:

buildNpmPackage rec {
  pname = "opengym-mcp";
  version = "1.2.11";
  src = ./..;

  sourceRoot = "${src.name}/mcp";

  nodejs = nodejs_22;

  npmDepsHash = "sha256-CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=";

  dontNpmBuild = true;

  installPhase = ''
    runHook preInstall
    mkdir -p $out/lib/opengym-mcp
    cp -r node_modules $out/lib/opengym-mcp/
    cp -r src $out/lib/opengym-mcp/

    mkdir -p $out/bin
    makeWrapper ${nodejs_22}/bin/node $out/bin/opengym-mcp \
      --add-flags "$out/lib/opengym-mcp/src/index.js"
    runHook postInstall
  '';

  meta = with lib; {
    description = "openGym MCP server — read-only stdio bridge for LLM clients";
    license = licenses.agpl3Plus;
    platforms = nodejs.meta.platforms;
  };
}
```

---

## 4. `nix/media.nix` — Exercise Media (Build-Time)

Fetches the exercise image/GIF dataset at build time into the Nix store.

```nix
{ lib, fetchFromGitHub }:

fetchFromGitHub {
  owner = "hasaneyldrm";
  repo = "exercises-dataset";
  rev = "7455efae41b330c265e7cd4b78dfa848e7ce5ebd";  # pin to same commit as CI
  hash = "sha256-DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD=";
  name = "opengym-exercise-media";
}
```

This produces a store path like `/nix/store/xxxx-opengym-exercise-media/` containing `images/` and `videos/` directories. Used when `services.opengym.media.fetchAtBuild = true`.

---

## 5. `nix/media-script.nix` — Runtime Media Fetch

A shell script that runs as a systemd oneshot to clone the media on first boot.

```nix
{ lib, writeShellScriptBin, git }:

writeShellScriptBin "opengym-fetch-media" ''
  set -euo pipefail
  MEDIA_DIR="''${1:?Usage: opengym-fetch-media <media-dir>}"
  mkdir -p "$MEDIA_DIR/img" "$MEDIA_DIR/gif"

  if [ -n "$(ls -A "$MEDIA_DIR/img" 2>/dev/null)" ]; then
    echo "Exercise media already present — skipping download."
    exit 0
  fi

  echo "Downloading exercise media (~140 MB, one time)..."
  TMPDIR=$(mktemp -d)
  trap 'rm -rf "$TMPDIR"' EXIT
  ${git}/bin/git clone --depth 1 https://github.com/hasaneyldrm/exercises-dataset "$TMPDIR/ds"
  cp "$TMPDIR/ds/images/"*.jpg "$MEDIA_DIR/img/"
  cp "$TMPDIR/ds/videos/"*.gif "$MEDIA_DIR/gif/"
  echo "Exercise media ready."
''
```

---

## 6. `nix/opengym.nix` — NixOS Module

The main NixOS module. This is the largest file.

### Module Options

```nix
{ config, lib, pkgs, ... }:

let
  cfg = config.services.opengym;
  pkg = cfg.package;  # the flake's package set

  mediaDir = if cfg.media.fetchAtBuild
    then "${pkg.opengym-media}"
    else cfg.media.dataDir;

  apiEnv = {
    PORT = toString cfg.apiPort;
    DATA_DIR = cfg.dataDir;
    RP_ID = cfg.rpId;
    ORIGIN = cfg.origin;
    RP_NAME = cfg.rpName;
    SESSION_DAYS = toString cfg.sessionDays;
    ALLOW_GUEST = if cfg.allowGuest then "1" else "0";
    INVITE_ONLY = if cfg.inviteOnly then "1" else "0";
    AUDIT_LOG = if cfg.auditLog then "1" else "0";
    AUDIT_MAX = toString cfg.auditMax;
    AUDIT_DAYS = toString cfg.auditDays;
    AUDIT_IP = cfg.auditIp;
    VAPID_SUBJECT = cfg.vapidSubject;
  } // lib.optionalAttrs (cfg.adminUids != "") {
    ADMIN_UIDS = cfg.adminUids;
  };

  apiEnvString = lib.concatStringsSep " " (
    lib.mapAttrsToList (k: v: "${k}=${lib.escapeShellArg v}") apiEnv
  );

in {
  options.services.opengym = {
    enable = lib.mkEnableOption "openGym self-hosted gym tracker";

    package = lib.mkOption {
      type = lib.types.package;
      description = "The openGym package set (typically the flake output).";
    };

    # -- Data & storage --
    dataDir = lib.mkOption {
      type = lib.types.path;
      default = "/var/lib/opengym";
      description = "Persistent data directory (db.json, state files, secrets).";
    };

    # -- API configuration --
    apiPort = lib.mkOption {
      type = lib.types.port;
      default = 3000;
      description = "Port the API listens on (internal, proxied by nginx).";
    };

    rpId = lib.mkOption {
      type = lib.types.str;
      default = "localhost";
      description = "WebAuthn Relying Party ID (bare hostname, must match address bar).";
    };

    origin = lib.mkOption {
      type = lib.types.str;
      default = "http://localhost:8080";
      description = "Full origin URL for CSRF validation (must match address bar).";
    };

    rpName = lib.mkOption {
      type = lib.types.str;
      default = "openGym";
      description = "Display name for passkey registration prompts.";
    };

    sessionDays = lib.mkOption {
      type = lib.types.ints.unsigned;
      default = 90;
      description = "Session cookie lifetime in days.";
    };

    # -- Access control --
    adminUids = lib.mkOption {
      type = lib.types.str;
      default = "";
      description = "Comma-separated user IDs granted admin access.";
    };

    inviteOnly = lib.mkEnableOption "require invite code for new signups";

    allowGuest = lib.mkOption {
      type = lib.types.bool;
      default = true;
      description = "Allow 'Continue without account' (guest mode).";
    };

    # -- Audit --
    auditLog = lib.mkOption {
      type = lib.types.bool;
      default = true;
      description = "Enable activity audit log.";
    };

    auditMax = lib.mkOption {
      type = lib.types.ints.unsigned;
      default = 5000;
      description = "Max audit events kept (0 = unlimited).";
    };

    auditDays = lib.mkOption {
      type = lib.types.ints.unsigned;
      default = 90;
      description = "Max days of audit events kept.";
    };

    auditIp = lib.mkOption {
      type = lib.types.enum [ "off" "net" "full" ];
      default = "off";
      description = "IP recording mode: off, net (masked), full.";
    };

    # -- Notifications --
    vapidSubject = lib.mkOption {
      type = lib.types.str;
      default = "";
      description = "VAPID subject for push notifications (defaults to ORIGIN).";
    };

    # -- Web / Nginx --
    webPort = lib.mkOption {
      type = lib.types.port;
      default = 8080;
      description = "Port nginx listens on (the port you browse to).";
    };

    virtualHost = lib.mkOption {
      type = lib.types.nullOr lib.types.str;
      default = null;
      description = "Override: if set, configure nginx as a virtualHost instead of defaultServer.";
    };

    # -- Media --
    media = {
      fetchAtBuild = lib.mkOption {
        type = lib.types.bool;
        default = false;
        description = "Fetch exercise media at build time (into Nix store). If false, fetch at runtime.";
      };

      dataDir = lib.mkOption {
        type = lib.types.path;
        default = "${cfg.dataDir}/media";
        description = "Directory for runtime-fetched exercise media.";
      };
    };

    # -- MCP --
    mcp = {
      enable = lib.mkEnableOption "openGym MCP server (stdio bridge for LLM clients)";
    };
  };

  config = lib.mkIf cfg.enable {
    # ... (see implementation section below)
  };
}
```

### Implementation (`config` block)

#### System user & directories

```nix
users.users.opengym = {
  isSystemUser = true;
  group = "opengym";
  description = "openGym service user";
};

users.groups.opengym = {};

systemd.tmpfiles.rules = [
  "d ${cfg.dataDir} 0750 opengym opengym - -"
  "d ${cfg.media.dataDir} 0755 opengym opengym - -"
];
```

#### API systemd service

```nix
systemd.services.opengym-api = {
  description = "openGym API server";
  after = [ "network.target" ];
  wantedBy = [ "multi-user.target" ];
  environment = apiEnv;
  serviceConfig = {
    ExecStart = "${cfg.package.opengym-api}/bin/opengym-api";
    User = "opengym";
    Group = "opengym";
    StateDirectory = "opengym";
    StateDirectoryMode = "0750";
    Restart = "on-failure";
    RestartSec = 5;

    # Hardening
    NoNewPrivileges = true;
    ProtectSystem = "strict";
    ProtectHome = true;
    PrivateTmp = true;
    PrivateDevices = true;
    ProtectKernelTunables = true;
    ProtectKernelModules = true;
    ProtectControlGroups = true;
    RestrictNamespaces = true;
    RestrictSUIDSGID = true;
    MemoryDenyWriteExecute = true;
    LockPersonality = true;
    SystemCallFilter = [ "@system-service" "~@privileged" ];
    ReadWritePaths = [ cfg.dataDir ];
  };
};
```

#### Media fetch service (runtime mode)

```nix
systemd.services.opengym-media = lib.mkIf (!cfg.media.fetchAtBuild) {
  description = "Download exercise media for openGym";
  after = [ "network-online.target" ];
  wants = [ "network-online.target" ];
  wantedBy = [ "multi-user.target" ];
  serviceConfig = {
    ExecStart = "${cfg.package.opengym-fetch-media}/bin/opengym-fetch-media ${cfg.media.dataDir}";
    Type = "oneshot";
    RemainAfterExit = true;
    User = "opengym";
    Group = "opengym";
    StateDirectory = "opengym";
  };
};
```

#### Nginx configuration

```nix
services.nginx = {
  enable = lib.mkDefault true;

  virtualHosts.${if cfg.virtualHost != null then cfg.virtualHost else "_"} = {
    # When virtualHost is null, we configure the default server
    default = (cfg.virtualHost == null);

    listen = lib.optionals (cfg.virtualHost == null) [
      { addr = "0.0.0.0"; port = cfg.webPort; }
    ];

    root = "${cfg.package.opengym-frontend}/share/opengym";

    # SPA fallback
    locations = {
      "/" = {
        tryFiles = "$uri $uri/ /index.html";
      };

      # API reverse proxy
      "^~ /api/" = {
        proxyPass = "http://127.0.0.1:${toString cfg.apiPort}";
        extraConfig = ''
          proxy_http_version 1.1;
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $remote_addr;
          proxy_set_header X-Forwarded-Proto $scheme;
        '';
      };

      # Exercise images (runtime media)
      "~* \\.(png|jpg|jpeg|gif|ico|svg|woff|woff2|webp|avif)$" = {
        extraConfig = ''
          expires 30d;
          add_header Cache-Control "public, max-age=2592000, immutable";
          add_header X-Frame-Options "DENY" always;
          add_header X-Content-Type-Options "nosniff" always;
        '';
      };
    };

    extraConfig = ''
      # Security headers
      add_header X-Frame-Options "DENY" always;
      add_header X-Content-Type-Options "nosniff" always;
      add_header Referrer-Policy "same-origin" always;
      add_header Content-Security-Policy "frame-ancestors 'none'" always;

      # Gzip
      gzip on;
      gzip_types text/plain text/css application/json application/javascript image/svg+xml;
      gzip_vary on;
      gzip_min_length 1024;
    '';
  };
};
```

#### MCP server (optional)

```nix
systemd.services.opengym-mcp = lib.mkIf cfg.mcp.enable {
  description = "openGym MCP server";
  after = [ "network.target" ];
  serviceConfig = {
    ExecStart = "${cfg.package.opengym-mcp}/bin/opengym-mcp";
    StandardInput = "null";
    StandardOutput = "journal";
    User = "opengym";
    Group = "opengym";
    Restart = "on-failure";
    Environment = [ "DATA_DIR=${cfg.dataDir}" ];
  };
};
```

#### Media nginx location (runtime vs build-time)

When `fetchAtBuild = true`, the media is in the Nix store and we symlink it into the nginx root or add an alias:

```nix
# In the nginx virtualHost, add a location alias for runtime media:
locations."~* \\.(png|jpg|jpeg|gif)$".alias =
  if cfg.media.fetchAtBuild
  then "${cfg.package.opengym-media}/images/"
  else "${cfg.media.dataDir}/img/";
```

The exact approach depends on how the exercise dataset directories are structured (`images/` vs `img/`, `videos/` vs `gif/`). The nginx alias maps the URL paths (`/img/`, `/gif/`) to the correct filesystem paths.

---

## 7. `nix/default.nix` — Package Aggregator

```nix
{ pkgs, callPackage }:

{
  opengym-frontend = callPackage ./frontend.nix {};
  opengym-api = callPackage ./api.nix {};
  opengym-mcp = callPackage ./mcp.nix {};
  opengym-media = callPackage ./media.nix {};
  opengym-fetch-media = callPackage ./media-script.nix {};
}
```

---

## 8. `flake.nix` — Flake Entry Point

```nix
{
  description = "openGym — self-hosted gym & body-weight tracker";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        opengymPkgs = import ./nix { inherit pkgs; };
      in {
        packages = opengymPkgs // {
          default = opengymPkgs.opengym-frontend;
        };

        apps.opengym = {
          type = "app";
          program = "${pkgs.writeShellScript "opengym" ''
            # Start API in background, serve frontend with a simple server
            ${opengymPkgs.opengym-api}/bin/opengym-api &
            API_PID=$!
            trap "kill $API_PID" EXIT
            ${pkgs.python3}/bin/python3 -m http.server 8080 \
              --directory ${opengymPkgs.opengym-frontend}/share/opengym
          ''}";
        };

        apps.default = self.apps.${system}.opengym;

        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_22
            coreutils
            git
          ];
          shellHook = ''
            echo "openGym dev shell (Node.js $(node --version))"
            echo "  cd frontend && npm install && npm run dev"
            echo "  cd api && npm install && node server.js"
          '';
        };
      }
    ) // {
      nixosModules.opengym = import ./nix/opengym.nix;
      nixosModules.default = self.nixosModules.opengym;
    };
}
```

---

## 9. NixOS Usage (End-User)

After the flake is in the repo, a user configures their NixOS machine like this:

```nix
# configuration.nix or flake-based config
{
  inputs.opengym.url = "github:DuarteSantos8/opengym";  # or local path

  outputs = { self, nixpkgs, opengym, ... }: {
    nixosConfigurations.mybox = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        opengym.nixosModules.opengym
        {
          services.opengym = {
            enable = true;
            rpId = "gym.example.com";
            origin = "https://gym.example.com";
            webPort = 443;  # or use ACME + forceSSL
            adminUids = "my-uid";
            media.fetchAtBuild = true;  # bake media into the system
          };

          # Optional: ACME for TLS
          security.acme.acceptTerms = true;
          security.acme.certs."gym.example.com".email = "me@example.com";
          services.nginx.virtualHosts."gym.example.com" = {
            enableACME = true;
            forceSSL = true;
          };
        }
      ];
    };
  };
}
```

Then: `sudo nixos-rebuild switch --flake .#mybox` — done. No Docker, no `docker compose`, no manual setup.

---

## 10. Implementation Steps

### Phase 1: Nix Packages (no NixOS module yet)

1. **Create `nix/` directory** and `nix/default.nix`.
2. **Create `nix/frontend.nix`** — build with `buildNpmPackage`, compute `npmDepsHash` via `prefetch-npm-deps`.
3. **Create `nix/api.nix`** — install deps + wrap `node server.js`.
4. **Create `nix/mcp.nix`** — install deps + wrap `node src/index.js`.
5. **Create `nix/media.nix`** — `fetchFromGitHub` pinned to the same commit as the Docker `media` service.
6. **Create `nix/media-script.nix`** — runtime fetch script.
7. **Create `flake.nix`** with `packages`, `apps`, `devShells` outputs.
8. **Verify**: `nix build .#opengym-frontend`, `nix build .#opengym-api`, `nix run .#opengym`.

### Phase 2: NixOS Module

1. **Create `nix/opengym.nix`** — all options, systemd services, nginx config, user/group setup, hardening.
2. **Wire into `flake.nix`** as `nixosModules.opengym`.
3. **Test locally**: Use a NixOS VM test or `nixos-rebuild test` with the module enabled.
4. **Verify**: browse to `http://localhost:8080`, register a passkey, create a workout.

### Phase 3: Documentation & Polish

 1. **Update `docs/SELF_HOSTING.md`** — add a "NixOS" section alongside the Docker instructions.
 2. **Add `docs/NIX.md`** — flake usage, NixOS module options reference, troubleshooting.
 3. **Update `CONTRIBUTING.md`** — mention the flake devShell.
 4. **Update `.gitlab-ci.yml`** — optional: add a CI job that builds the Nix packages to catch hash drift.

---

## 11. npmDepsHash Computation

Both `frontend` and `api` packages need `npmDepsHash`. Compute them:

```bash
# For frontend:
cd frontend
prefetch-npm-deps package-lock.json
# → prints sha256-XXXX...

# For api:
cd ../api
prefetch-npm-deps package-lock.json
# → prints sha256-YYYY...

# For mcp:
cd ../mcp
prefetch-npm-deps package-lock.json
# → prints sha256-ZZZZ...
```

These hashes go into the respective `.nix` files and must be updated whenever
`package-lock.json` changes (Renovate will handle this if configured).

---

## 12. Key Architectural Decisions

| Decision | Rationale |
| --- | --- |
| **`buildNpmPackage`** over `node2nix` | Standard nixpkgs approach; handles lockfile caching, works with `npm ci`, well-maintained |
| **Separate packages** (frontend, API, MCP) | Each has independent build/update cycles; frontend rebuilds don't invalidate API |
| **Nginx via NixOS module** (not bundled) | Leverages the existing `services.nginx` NixOS infrastructure; integrates with ACME, logging, etc. |
| **Systemd hardening** | Production-ready security: no-new-privs, read-only fs except data dir, capability dropping |
| **`StateDirectory = "opengym"`** | NixOS creates `/var/lib/opengym` automatically, owned by the service user |
| **Configurable media** (build-time vs runtime) | Build-time for airgapped/immutable; runtime for bandwidth-conscious users |
| **`defaultServer` vs `virtualHost`** | Default is simple (`:8080`); virtualHost for production with TLS/ACME |
| **Pin media to same commit as Docker** | Ensures the Nix deployment serves identical content to the Docker deployment |

---

## 13. Potential Challenges

1. **`prefetch-npm-deps` hash stability** — npm lockfiles can produce non-deterministic dep graphs. If hashes drift, the `package-lock.json` is the source of truth and `prefetch-npm-deps` should be stable.

2. **Frontend build environment** — Vite 8 may need specific env vars or patches to build in the Nix sandbox (no network access). The `buildNpmPackage` hooks handle npm deps, but Vite's runtime downloads (e.g., platform-specific esbuild binaries) need to be addressed. Solution: set `ESBUILD_BINARY_PATH` to the nixpkgs esbuild, or use `makeCacheWritable`.

3. **Nginx + static media paths** — The Docker setup mounts media into `/usr/share/nginx/html/img/` and `/gif/`. The NixOS module needs to map these URL paths correctly to either the Nix store (build-time) or `/var/lib/opengym/media/img/` (runtime). This requires careful nginx `alias` configuration.

4. **MCP server DataDir** — The MCP server reads from the same `DATA_DIR` as the API. The NixOS module must ensure both the API and MCP services have read access to the data directory.

5. **VAPID key generation** — The API auto-generates `data/vapid.json` on first boot. This works in NixOS the same as Docker — no special handling needed, just ensure the data directory is writable by the service user.
