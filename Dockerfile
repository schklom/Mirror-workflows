FROM ghcr.io/linuxserver/homeassistant:latest

RUN apk update && \
    apk add --no-cache iputils espeak alsa-utils && \
    apk cache clean

# To avoid the mess in https://github.com/linuxserver/docker-homeassistant/blob/main/root/etc/s6-overlay/s6-rc.d/init-config-homeassistant/run
RUN PY_LOCAL_PATH=$(find /usr/local/lib -maxdepth 1 -name python* -type d | cut -d " " -f 1 | sed -E "s/.bak$//"); \
    echo "py_path=${PY_LOCAL_PATH}"; \
    if [[ -d "${PY_LOCAL_PATH}.bak" ]]; then \
        echo -e "\nDeleting ${PY_LOCAL_PATH}\n"; \
        rm -rf "${PY_LOCAL_PATH}"; \
        \
        echo -e "\nRenaming ${PY_LOCAL_PATH}.bak to ${PY_LOCAL_PATH}\n"; \
        mv "${PY_LOCAL_PATH}.bak" "${PY_LOCAL_PATH}"; \
        \
        echo -e "\nChange ownership of the folder ${PY_LOCAL_PATH}\n"; \
        chown -R abc:abc "${PY_LOCAL_PATH}"; \
    fi
