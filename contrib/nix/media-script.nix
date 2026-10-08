{
  writeShellScriptBin,
  curl,
  gnutar,
  datasetRev,
}:

writeShellScriptBin "opengym-fetch-media" ''
  set -euo pipefail
  MEDIA_DIR="''${1:?Usage: opengym-fetch-media <media-dir>}"
  MEDIA_URL="''${MEDIA_URL:-https://github.com/hasaneyldrm/exercises-dataset}"
  mkdir -p "$MEDIA_DIR/img" "$MEDIA_DIR/gif"

  if [ -n "$(ls -A "$MEDIA_DIR/img" 2>/dev/null)" ]; then
    echo "Exercise media already present — skipping download."
    exit 0
  fi

  echo "Downloading exercise media (~140 MB, one time)..."
  TMPDIR=$(mktemp -d)
  trap 'rm -rf "$TMPDIR"' EXIT
  ${curl}/bin/curl -fL --retry 3 "$MEDIA_URL/archive/${datasetRev}.tar.gz" -o "$TMPDIR/dataset.tar.gz"
  ${gnutar}/bin/tar -xzf "$TMPDIR/dataset.tar.gz" -C "$TMPDIR"
  cp "$TMPDIR/exercises-dataset-${datasetRev}"/images/*.jpg "$MEDIA_DIR/img/"
  cp "$TMPDIR/exercises-dataset-${datasetRev}"/videos/*.gif "$MEDIA_DIR/gif/"
  echo "Exercise media ready (pinned to ${datasetRev})."
''