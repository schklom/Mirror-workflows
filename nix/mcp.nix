{ lib, buildNpmPackage, nodejs_22, makeWrapper }:

buildNpmPackage rec {
  pname = "opengym-mcp";
  version = "1.2.11";

  src = ./../mcp;

  nodejs = nodejs_22;

  npmDepsHash = "sha256-15xl0gNcmAdcPp/cwlJNIAmNqoRWM1dsMwwAloNZeu0=";

  dontNpmBuild = true;

  nativeBuildInputs = [ makeWrapper ];

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
    homepage = "https://gitlab.com/DuarteSantos8/opengym";
    license = licenses.agpl3Plus;
    platforms = nodejs.meta.platforms;
  };
}
