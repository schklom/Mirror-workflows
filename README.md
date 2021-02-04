# pialert
A docker version of @pucherot pi.alert

Reference : https://github.com/pucherot/Pi.Alert

This docker image is based on a Debian source and adds the code from @pucherot pi.alert.  The default pialert.conf file is modified from the original to create a set of default values that can be used in the initial image build without prompting.  The config directory must be mounted on the host system to be accessible.  You can mofidy the defaults and then restart the docker container.

To build the image:

Download Pi.Alert and uncompress to pialert directory

curl -LO https://github.com/pucherot/Pi.Alert/raw/main/tar/pialert_latest.tar
tar xvf pialert_latest.tar
rm pialert_latest.tar

Inside the image, replace the pialert.conf with the one include here
mv pialert/config/pialert.conf pialert/config/pialert.conf.orig
cp ./pialert.conf pialert/config/pialert.conf

docker build -t bcollier/pialert:0.9 .

To run it:

docker run \
        --rm \
        --name=pialert \
        --net=host \
        --detach \
        -v /opt/pialert/config:/opt/pialert/config \
        bcollier/pialert:0.9
        
In order for arp-scan to work in a docker, the container must use net=host (if you know a way around, let me know).

You can then manually add pi.alert to your pi-hole Local DNS names pointing the the host machine IP. The address on your system becomes http://pi.alert

