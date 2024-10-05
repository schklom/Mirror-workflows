#!/bin/bash

# Generate a self-signed certificate for use with TLS.
# If at all possible, use Let's Encrypt and certbot!

openssl req -new -x509 -noenc -newkey ec:<(openssl ecparam -name secp384r1) -keyout server.key -out server.crt -days 365
