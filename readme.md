# README #

## Installation ##

Recommended way to deploy is with docker

- clone from gitlab
- edit config file (see below)
- use docker to deploy

### Configuration:

with docker: set the variables in your docker service / docker-compose.yml
without docker: copy .env.sample to .env and edit that

Config options:

DATABASE_URL - full uri to postgres database including name/pw/db
(example: postgres://test:test@localhost:5432/test)

BASE_URL - the external url how the app is reachable. required to build the feeds
(example: http://localhost:8080)

APP_PORT - internal port for listening to http connections
(example: 3000)

DEBUG - for debug output, see npm debug package for details
(example: ap*)

CRON_BASE - the base wait time to next feed check. only 1 feed is checked at a  time
(example: 50)

CRON_RNG - the random wait time added to the base time in seconds
(example: 20)

## Scheduled checking

the app will check one feed at a time, then wait for the cron timer to check the next one.

every feed has a set time when it can be checked again, based on the checktime configured and if it had errors during the last fetch

when there is an error refreshing a feed, the next checks are delayed by 1, 6, and 30 hours depending on how often an error ocurreed. after 4 errors, the feed is disabled automatically

## tech

Feedropolis uses fetch for loading pages directly (without scripts) and electron (via nightmare) when loading scripts.
Running electron on a server requires some workarounds with Xvfb. See docker-entrypoint and Dockerfile for details. 
