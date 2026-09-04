{
  lib,
  buildNpmPackage,
  nodejs_22,
  importNpmLock,
  version,
}:

buildNpmPackage rec {
  pname = "opengym-frontend";
  inherit version;

  # The frontend imports api/coach/core/* (../../../api/coach/core/…), so the build
  # needs the repo root — same layout the Dockerfile uses (see web/Dockerfile).
  src = ./..;
  npmRoot = "frontend";

  nodejs = nodejs_22;

  npmDeps = importNpmLock { npmRoot = src + "/frontend"; };
  npmConfigHook = importNpmLock.npmConfigHook;

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
