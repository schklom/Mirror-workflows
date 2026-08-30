{
  lib,
  buildNpmPackage,
  nodejs_22,
  version,
}:

buildNpmPackage rec {
  pname = "opengym-frontend";
  inherit version;

  src = ./../frontend;

  nodejs = nodejs_22;

  npmDepsHash = "sha256-bmhFw2K1+6VusIUc0346abExPxyaDnY+X8AnWbbkWvE=";

  npmBuildScript = "build";

  npmFlags = [ "--ignore-scripts" ];

  buildPhase = ''
    runHook preBuild
    export NODE_ENV=production
    export PATH="$PWD/node_modules/.bin:$PATH"
    npm run build
    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall
    mkdir -p $out/share/opengym
    cp -r dist/* $out/share/opengym/
    runHook postInstall
  '';

  meta = with lib; {
    description = "openGym frontend — self-hosted gym & body-weight tracker PWA";
    homepage = "https://gitlab.com/DuarteSantos8/opengym";
    license = licenses.agpl3Plus;
    platforms = nodejs.meta.platforms;
  };
}
