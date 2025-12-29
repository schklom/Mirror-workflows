#!/usr/bin/env bash

CONFIG_TEMPLATE="${SNAP}/config.example.yml"
CONFIG_FILE="${SNAP_COMMON}/config.yml"

# Copy config if not present
if [[ ! -f "${CONFIG_FILE}" ]]; then
    # Then we likely also need to create the database directory
    DB_DIR="${SNAP_COMMON}/db"
    mkdir -p "${DB_DIR}"

    cp "${CONFIG_TEMPLATE}" "${CONFIG_FILE}"
    # Set Database directory
    sed -i "s|^DatabaseDir: .*|DatabaseDir: \"${DB_DIR}\"|g" "${CONFIG_FILE}"
fi

# Start FMD Server
exec "${SNAP}/bin/fmd-server" --config "${CONFIG_FILE}" "$@"
