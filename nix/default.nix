{
  pkgs,
  callPackage ? pkgs.callPackage,
}:

{
  opengym-frontend = callPackage ./frontend.nix { };
  opengym-api = callPackage ./api.nix { };
  opengym-mcp = callPackage ./mcp.nix { };
  opengym-media = callPackage ./media.nix { };
  opengym-fetch-media = callPackage ./media-script.nix { };
}
