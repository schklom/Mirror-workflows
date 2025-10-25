#!/bin/bash

# Helper script to generate a self-signed root CA and
# a certificate for FMD Server signed by that custom CA.
#
# If at all possible, use Let's Encrypt and certbot!
#
# Tested with OpenSSL 3.4.1.

set -eu

DOMAIN=${1:-fmd.example.com}

echo "Creating certs for FMD Server domain '${DOMAIN}'..."

echo
echo "Creating private key for root CA..."
openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:prime256v1 -out root.key

echo "Creating self-signed certificate for root CA..."
openssl req -x509 -new -key root.key -out root.crt -days 3650 -subj "/C=DE/O=Testorg/CN=Test CA"

echo
echo "Creating private key for server..."
openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:prime256v1 -out server.key

echo "Creating certificate signing request (CSR) for server..."
openssl req -new -key server.key -out server.csr -subj "/C=DE/O=Testorg/CN=${DOMAIN}" -addext "subjectAltName = DNS:${DOMAIN}" # Change to IP: when using a raw IP.

echo "Creating certificate for server..."
openssl req -noenc -CA root.crt -CAkey root.key -in server.csr -out server.crt -days 90 -copy_extensions copy -addext "basicConstraints = CA:FALSE"

# echo "Creating fullchain..."
# cat server.crt root.crt > fullchain.pem

echo
echo "Done! Next steps:"
echo "- Configure FMD Server (or your reverse proxy) with 'server.key' and 'server.crt'."
echo "- Configure your clients (like your phone) with the 'root.crt'."
echo "- Keep the 'root.key' private!"
