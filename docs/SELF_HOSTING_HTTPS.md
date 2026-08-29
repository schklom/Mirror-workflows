# Selfhosting with HTTPS

Since we handling a rather complex topic with this, it is separate from the [SELF_HOSTING.md](./SELF_HOSTING.md) which is focusing on how to run openGym.
This document is takes a more general approach on how to achieve "https at home", it is not necessarily focused on openGym and applies to self hosting in general.

When self hosting it is often thought of that one needs to expose their services to the internet, this is not necessarily the case.  
We can have https certificates without having to expose our precious hosts to the world. You can still do that if you want to access your applications from the internet without any VPN, but it's not necessary to take the risk.

Since VPN is a beast of it's own we'll only handle the certificates for now and grant https traffic to our local network hosts.

## Components

Given we have the following setup:
- a little server (e.g. a Raspberry Pi or mini PC) that runs our applications.
- a client (your PC, mobile, tablet, etc.)
- your router (the thing that provides internet access, wifi, etc.)

flowchart TD
    A[Router]
    A -->B[Laptop]
    A -->C[homelab]

simple, right?

### DNS

### Let's encrypt!

#### nginx proxy

#### caddy


