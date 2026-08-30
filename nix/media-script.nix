{
  writeShellScriptBin,
  git,
}:

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
