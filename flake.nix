{
  description = "openGym — self-hosted gym & body-weight tracker";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      ...
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};

        opengymPackages = {
          opengym-frontend = pkgs.callPackage ./nix/frontend.nix { };
          opengym-api = pkgs.callPackage ./nix/api.nix { };
          opengym-mcp = pkgs.callPackage ./nix/mcp.nix { };
          opengym-media = pkgs.callPackage ./nix/media.nix { };
          opengym-fetch-media = pkgs.callPackage ./nix/media-script.nix { };
        };

        opengymNixOSModule = self.nixosModules.opengym;

        testConfig = nixpkgs.lib.nixosSystem {
          inherit system;
          modules = [
            opengymNixOSModule
            {
              services.opengym = {
                enable = true;
                rpId = "localhost";
                origin = "http://localhost:8080";
                webPort = 8080;
                apiPort = 3000;
              };
              system.stateVersion = "25.05";
            }
          ];
        };

        cfg = testConfig.config.services.opengym;

        nginxVhosts = builtins.attrNames testConfig.config.services.nginx.virtualHosts;

        check = pkgs.runCommand "opengym-module-check" { } ''
          set -euo pipefail
          # Verify the module evaluated correctly
          echo "services.opengym.enable = ${if cfg.enable then "true" else "false"}"
          echo "services.opengym.apiPort = ${toString cfg.apiPort}"
          echo "services.opengym.webPort = ${toString cfg.webPort}"
          echo "services.opengym.rpId = ${cfg.rpId}"
          echo "services.opengym.origin = ${cfg.origin}"

          # Verify systemd service exists
          echo "systemd.services.opengym-api exists = ${if testConfig.config.systemd.services ? opengym-api then "true" else "false"}"

          # Verify nginx vhost
          echo "nginx virtualHosts = ${builtins.concatStringsSep ", " nginxVhosts}"

          # Verify user exists
          echo "users.users.opengym exists = ${if testConfig.config.users.users ? opengym then "true" else "false"}"

          # All checks passed
          touch $out
        '';
      in
      {
        packages = opengymPackages // {
          default = opengymPackages.opengym-frontend;
        };

        apps.opengym = {
          type = "app";
          program = "${pkgs.writeShellScript "opengym" ''
            exec ${opengymPackages.opengym-api}/bin/opengym-api
          ''}";
        };

        apps.default = self.apps.${system}.opengym;

        checks.nixos-module-eval = check;

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
    )
    // {
      nixosModules.opengym = import ./nix/opengym.nix;
      nixosModules.default = self.nixosModules.opengym;
    };
}
