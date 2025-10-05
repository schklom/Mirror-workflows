# Fail2ban

This document describes how to configure [fail2ban](https://fail2ban.org) with FMD Server.

## Background

FMD Server already rate-limits login attempts on an application level.
However, this is only on a per-user basis: after 5 failed login attempts,
FMD Server locks the account in question and sends a push to the device
informing the user about the intrusion attempt.

fail2ban work across all user accounts on an FMD Server instance.
It works on a per-IP basis.
If an IP tries to log into many different accounts and fails,
fail2ban will detect and block this.

## Inspecting syslog

The fail2ban configuration below assumes that FMD Server is logging to syslog.
To view the logs:

```sh
journalctl -t fmd-server
journalctl -q _SYSTEMD_UNIT=fmd-server-prod.service
```

## Configuring fail2ban

1. Do all of the following as root!

1. Install fail2ban.
   On Debian: `sudo apt install fail2ban`

1. Install the filter, by creating the file `/etc/fail2ban/filter.d/fmd-server.local`
   with the following content:

```conf
# Filter for FMD Server

[INCLUDES]
before = common.conf

[Definition]
# Optional port after ADDR
failregex = ^.*"remoteIp":"<ADDR>:?\d*".*"message":"(?:failed|blocked) login attempt".*$
```

1. Install the jail, by creating the file `/etc/fail2ban/jail.d/fmd-server.local`
   with the following content:

```conf
# Jail for FMD Server

[fmd-server]
enabled = true
# https://man.archlinux.org/man/jail.conf.5#systemd
backend = systemd[journalflags=1]
journalmatch = SYSLOG_IDENTIFIER=fmd-server
```

1. Both the filter and the jail file should be owned by root:root and have permissions 0644.

1. Restart fail2ban: `sudo service fail2ban restart`

1. View the status of the fmd-server jail:

```sh
$ sudo fail2ban-client status fmd-server
Status for the jail: fmd-server
|- Filter
|  |- Currently failed: 1
|  |- Total failed:     1
|  `- Journal matches:  SYSLOG_IDENTIFIER=fmd-server
`- Actions
   |- Currently banned: 1
   |- Total banned:     1
   `- Banned IP list:   10.0.0.100
```

1. Manually make some failing login attempts from another device.
   Inspect syslog and fail2ban-client to verify that they are detected.

## Debugging

To manually test the filter regex:

```sh
sudo fail2ban-regex -v --journalmatch='SYSLOG_IDENTIFIER="fmd-server"' systemd-journal[journalflags=1] fmd-server
```
