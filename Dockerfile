FROM homeassistant/home-assistant:stable

# Add wakeonlan according to https://pypi.org/project/wakeonlan/ and remove useless data
#RUN pip3 install --no-cache-dir --no-index --only-binary=:all wakeonlan
# Put your python scripts in the folder below, according to https://www.home-assistant.io/integrations/python_script/
#RUN mkdir /config/python_scripts

# Add custom store (https://github.com/hacs/integration and https://hacs.xyz/docs/setup/download#home-assistant-core)
WORKDIR /config
#RUN wget -O - https://get.hacs.xyz | bash -

# https://github.com/custom-components/pyscript#option-2-manual
RUN cd /config
RUN mkdir -p /config/custom_components
RUN git clone https://github.com/custom-components/pyscript.git /tmp/pyscript
RUN cp -pr /tmp/pyscript/custom_components/pyscript /config/custom_components
RUN rm -rf /tmp/pyscript
