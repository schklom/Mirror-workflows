#!/usr/bin/env bash

SRC="$SNAP/config.example.yml"
DST="$SNAP_USER_COMMON/config.yml"

# Copy config only if not present
if [[ ! -f "$DST" ]]; then
    # Create directory if needed
    DB_DST="$SNAP_USER_COMMON/db"
    mkdir -p "$DB_DST"

    cp "$SRC" "$DST"
    chmod 600 "$DST"
    # Set Database directory
    sed -i "s|DatabaseDir: \"\"|DatabaseDir: \"$DB_DST\"|g" $DST
fi

# Start your actual app
exec "$SNAP/bin/fmd-server" "$@"
