# pialert
A docker version of @pucherot pi.alert

This docker image is based on a Debian source and adds the code from @pucherot pi.alert.  The default pialert.conf file is modified from the original to create a set of default values that can be used in the initial image build without prompting.  The config directory must be mounted on the host system to be accessible.  You can mofidy the defaults and then restart the docker container.

Example:
to build the image:   docker build -t bcollier/pialert:0.9 .

to run it:

docker run \
        --rm \
        --name=pialert \
        --net=host \
        --detach \
        -v /opt/pialert/config:/opt/pialert/config \
        bcollier/pialert:0.9
        
In order for arp-scan to work in a docker, the container must use net=host (if you know a way around, let me know).



