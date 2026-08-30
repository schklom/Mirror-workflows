{
  lib,
  buildNpmPackage,
  nodejs_22,
  makeWrapper,
}:

buildNpmPackage rec {
  pname = "opengym-api";
  version = "1.2.11";

  src = ./../api;

  nodejs = nodejs_22;

  npmDepsHash = "sha256-KrJW6aaM5uzMZ7O1nJ7XVCnp4Da/qzX1r/1h8ojaQRM=";

  dontNpmBuild = true;

  nativeBuildInputs = [ makeWrapper ];

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
    homepage = "https://gitlab.com/DuarteSantos8/opengym";
    license = licenses.agpl3Plus;
    platforms = nodejs.meta.platforms;
  };
}
