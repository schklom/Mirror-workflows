# [Bibliogram](https://bibliogram.art)

[![Humane Tech badge.](https://raw.githubusercontent.com/cloudrac3r/bibliogram/master/art/humane-tech-badge.svg?sanitize=true)](https://github.com/humanetech-community/awesome-humane-tech#readme) ![GitHub](https://img.shields.io/github/license/cloudrac3r/bibliogram) [![Discussion on Matrix.](https://img.shields.io/matrix/bibliogram:matrix.org?label=%23bibliogram&logo=matrix)](https://matrix.to/#/#bibliogram:matrix.org)

## An alternative front-end for Instagram.

Bibliogram works without client-side JavaScript, has no ads or tracking, and doesn't urge you to sign up.

See Bibliogram's features: [Wiki:Features](https://github.com/cloudrac3r/bibliogram/wiki/Features)

Join the Bibliogram discussion room on Matrix: [#bibliogram:matrix.org](https://matrix.to/#/#bibliogram:matrix.org)

See also: [Invidious, a front-end for YouTube.](https://github.com/omarroth/invidious)

## Instances

The official instance is on https://bibliogram.art.

Community instances are listed [on the wiki page](https://github.com/cloudrac3r/bibliogram/wiki/Instances).

If you only use one computer, you can install Bibliogram on that computer and then access the instance through localhost.

## Installing

Select a section and follow the instructions in that section only.

### With bibliogram-updater

**This is the best method to run Bibliogram on a server.** This method **will** automatically keep Bibliogram up to date, requiring no maintenance after the initial setup.

The updater scripts run in fish. If installing fish isn't possible, please choose a different method.

To clone Bibliogram, install dependencies, and automatically keep it up to date in future, run this in a shell:

    wget -o install-bibliogram.sh https://raw.githubusercontent.com/cloudrac3r/bibliogram-updater/master/.clone.sh
    bash install-bibliogram.sh

If you want more details, extended documentation, or want to use it without pasting code, please check out the project page: https://github.com/cloudrac3r/bibliogram-updater

### With Docker

I have no idea how Docker works. Good luck. You **won't** be automatically updated to new versions with this.

[Discuss the Docker setup in issue #81](https://github.com/cloudrac3r/bibliogram/issues/81) and tell me about how I can make it more convenient for you, or even submit a pull request if you know what you want.

Recommended: Clone the repo, then `docker-compose up`.

Alternatively: `docker run -p 10407:10407 -v db:/app/db cloudrac3r/bibliogram`.

[Repository on Docker Hub.](https://hub.docker.com/repository/docker/cloudrac3r/bibliogram)

### Manually, if you've run webservers before

**This is the best method to run Bibliogram if you're a developer.** You **won't** be automatically updated to new versions with this.

1. Install [node.js](https://nodejs.org/en/) (^12.13.0 suggested)
1. `$ git clone https://github.com/cloudrac3r/bibliogram`  
If you are currently looking at a fork, be sure to actually install that fork instead!
1. `$ cd bibliogram`
1. `$ npm install --no-optional` (for Tor support, omit `--no-optional`)
1. Edit `/config.js` to suit your environment
1. `$ npm start`

Bibliogram is now running on `0.0.0.0:10407`.

You _must_ configure `website_origin`. Read [Wiki:Configuring](https://github.com/cloudrac3r/bibliogram/wiki/Configuring) for help.

### Manually, if you're new to running webservers

You **won't** be automatically updated to new versions with this.

Guide: [Wiki:Installing](https://github.com/cloudrac3r/bibliogram/wiki/Installing)

Problems? [Wiki:Troubleshooting](https://github.com/cloudrac3r/bibliogram/wiki/Troubleshooting)

You _must_ configure `website_origin`. Read [Wiki:Configuring](https://github.com/cloudrac3r/bibliogram/wiki/Configuring) for help.

### With Heroku

Don't deploy Bibliogram on Heroku. It's a really bad idea. Please read about the [ephemeral filesystem](https://devcenter.heroku.com/articles/active-storage-on-heroku#ephemeral-disk) which the database is stored on, and then read about [configuring with environment variables](https://github.com/cloudrac3r/bibliogram/wiki/Environment-variables), and then [read the rate limit documentation](https://github.com/cloudrac3r/bibliogram/wiki/Rate-limits), and then understand that Heroku will _never_ be unblocked because Instagram knows that because its IP address is from a cloud server it's going to be doing bad things. Despite these warnings, [you can still deploy on Heroku if you really want to.](https://heroku.com/deploy?template=https://github.com/cloudrac3r/bibliogram)

## Credits & license information

All of Bibliogram's code uses the [AGPL 3.0 license](https://choosealicense.com/licenses/agpl-3.0/). In short, this means that if you make any modifications to the code and then publish the result (e.g. by hosting the result on a webserver), you must publicly distribute your changes and declare that they also use AGPL 3.0.

Site banner by [TheFrenchGhosty](https://github.com/TheFrenchGhosty), [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)

Site font is [Bariol](http://atipofoundry.com/fonts/bariol) by [atipo foundry](http://atipofoundry.com/), located in /src/site/html/static/fonts. Proprietary license, used with permission. See http://atipofoundry.com/license, section "webfont license".
