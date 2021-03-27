# README #

## Introduction ##

Feedropolis is a rss feed generator. It can take any site that is accessible directly via an URL, parse it's contents via XPATH and generate an Atom feed from that content.

How to parse each site is selected by the user in a visual GUI. Feedropolis can even handle content that is rendered by javascript. The only requirement is a direct URL.

Feed items are created by links. If the selected item does not have a url (href-attribute) and a title (text), no feed item can be created.

## Installation ##

Deployment with docker is recommended

- Pre-requisite: you need to have have installed [docker](https://docs.docker.com/engine/install/debian/#install-using-the-convenience-script) and [docker-compose](https://docs.docker.com/compose/install/)
- clone or download the repo from [gitlab](https://gitlab.com/stormking/feedropolis/)
- edit the config (see below)
- use docker to deploy: `docker-compose up -d` builds and starts the app including the database in the background
- then open [localhost](http://localhost/) in the browser to access the UI

### Configuration:

All config settings are specified via ENV-vars.

- with docker: set the variables in your docker service / docker-compose.yml
- without docker: copy .env.sample to .env and edit that file

ENV vars set in docker-compose.yaml override vars in the .env file.

Config options:

DATABASE_URL - full uri to postgres database including name/pw/db
(example: postgres://test:test@localhost:5432/test)

BASE_URL - the external url how the app is reachable. required to build the feeds
(example: http://localhost:8080)

APP_PORT - port for listening to http connections
(example: 3000)

DEBUG - for debug output, see npm debug package for details
(example: ap*)

CRON_BASE - the base wait time between feed checks in seconds. only 1 feed is checked at a  time
(example: 50)

CRON_RNG - the maximum random wait time added to the base time in seconds
(example: 20 - would add between 0 and 20 seconds each time)

USER_AGENT - specify the "browser" user agent string used when fetching html content

## Scheduled checking

the app will check one feed at a time, then wait for the cron timer to check the next one.

every feed has a set time when it can be checked again, based on the checktime configured and if it had errors during the last fetch

when there is an error refreshing a feed, the next checks are delayed by 1, 6, and 30 hours depending on how often an error ocurreed. after 4 errors, the feed is disabled automatically. the error count can be reset in the UI

## Database

Migrations will be applied automatically at startup. They can be run without the server by running `npm run migrate`

## Tech

Feedropolis uses fetch for loading pages directly (without scripts) and electron (via nightmare) when loading with scripts.
Running electron on a server requires some workarounds with Xvfb. See docker-entrypoint and Dockerfile for details.

## Changelog

### 2021-01-07

- added option to set cookies. the cookie string will be directly passed on as Cookie header.
- updated dependencies

### 2021-01-31

- fixed feed item dates. before now they were all set to the date the database was created

### 2021-03-27

- can now copy load and select parameters from other feeds for faster feed editing
