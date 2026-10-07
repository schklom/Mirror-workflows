{
  pkgs,
  callPackage ? pkgs.callPackage,
}:

let
  versions = import ./version.nix;
in
{
  opengym-frontend = callPackage ./frontend.nix { inherit (versions) version; };
  opengym-api = callPackage ./api.nix { inherit (versions) version; };
  opengym-mcp = callPackage ./mcp.nix { inherit (versions) version; };
  opengym-media = callPackage ./media.nix { inherit (versions) datasetRev; };
  opengym-fetch-media = callPackage ./media-script.nix { inherit (versions) datasetRev; };
}
