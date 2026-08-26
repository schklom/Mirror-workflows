{ lib, buildNpmPackage, nodejs_22 }:

buildNpmPackage rec {
  pname = "opengym-frontend";
  version = "1.2.11";

  src = ./../frontend;

  nodejs = nodejs_22;

  npmDepsHash = "sha256-+r74Jpxq3Yw7EZIZa9VHs+Vue2WukzC31Psyh2QVqHY=";

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
