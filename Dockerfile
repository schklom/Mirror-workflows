FROM ghcr.io/linuxserver/homeassistant:latest

RUN apk update && \
    apk add --no-cache iputils espeak alsa-utils && \
    apk cache clean

# To avoid the mess in https://github.com/linuxserver/docker-homeassistant/blob/main/root/etc/s6-overlay/s6-rc.d/init-config-homeassistant/run
RUN find /usr/local/lib -maxdepth 1 -name python* -type d
RUN PY_LOCAL_PATH=$(find /usr/local/lib -maxdepth 1 -name python* -type d | cut -d " " -f 1) && \
    PY_LOCAL_PATH="${PY_LOCAL_PATH%.bak}" && \
    if [[ -d "${PY_LOCAL_PATH}.bak" ]]; then \
        echo "diff" \
        diff -Bqr "${PY_LOCAL_PATH}" "${PY_LOCAL_PATH}.bak" \
        echo "Deleting the non-bak folder" \
        rm -rf "${PY_LOCAL_PATH}" \
        echo "Renaming bak folder to non-bak" \
        mv "${PY_LOCAL_PATH}.bak" "${PY_LOCAL_PATH}" \
        echo "Change ownership of the folder" \
        chown -R abc:abc "${PY_LOCAL_PATH}"; \
    fi
