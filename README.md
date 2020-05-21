# [Bibliogram](https://bibliogram.art)

[![Humane Tech badge.](https://raw.githubusercontent.com/cloudrac3r/bibliogram/master/art/humane-tech-badge.svg?sanitize=true)](https://github.com/humanetech-community/awesome-humane-tech#readme) ![GitHub](https://img.shields.io/github/license/cloudrac3r/bibliogram) [![Discussion on Matrix.](https://img.shields.io/matrix/bibliogram:matrix.org?label=%23bibliogram&logo=matrix)](https://matrix.to/#/#bibliogram:matrix.org)

## An alternative front-end for Instagram.

Bibliogram works without client-side JavaScript, has no ads or tracking, and doesn't urge you to sign up.

See Bibliogram's features: [Wiki:Features](https://github.com/cloudrac3r/bibliogram/wiki/Features)

Join the Bibliogram discussion room on Matrix: [#bibliogram:matrix.org](https://matrix.to/#/#bibliogram:matrix.org)

See also: [Invidious, a front-end for YouTube.](https://github.com/omarroth/invidious)

## Instances

The official instance is on https://bibliogram.art.

You can see a list of instances run by the community [on the wiki page](https://github.com/cloudrac3r/bibliogram/wiki/Instances).

If you only use one computer, you can install Bibliogram on that computer and then access the instance through localhost.

## Installing

Quick setup, if you've run webservers before:

1. Install [node.js](https://nodejs.org/en/) (^12.13.0 suggested)
1. `$ git clone https://github.com/cloudrac3r/bibliogram`  
If you are using a fork, be sure to actually install that fork instead!
1. `$ cd bibliogram`
1. `$ npm install --no-optional` (for Tor support, omit `--no-optional`)
1. Edit `/config.js` to suit your server environment
1. `$ npm start`

Bibliogram is now running on `0.0.0.0:10407`.

After installing, you _must_ configure `website_origin`. See [Wiki:Installing](https://github.com/cloudrac3r/bibliogram/wiki/Installing) and [Wiki:Configuring](https://github.com/cloudrac3r/bibliogram/wiki/Configuring) for more details. Problems? [Wiki:Troubleshooting](https://github.com/cloudrac3r/bibliogram/wiki/Troubleshooting)

You can also deploy on Heroku, though I personally would not recommend this. [Get started with Heroku.](https://heroku.com/deploy?template=https://github.com/cloudrac3r/bibliogram)

## Credits & license information

All of Bibliogram's code uses the [AGPL 3.0 license](https://choosealicense.com/licenses/agpl-3.0/). In short, this means that if you make any modifications to the code and then publish the result (e.g. by hosting the result on a webserver), you must publicly distribute your changes and declare that they also use AGPL 3.0.

Site banner by [TheFrenchGhosty](https://gitlab.com/TheFrenchGhosty), [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)

Site font is [Bariol](http://atipofoundry.com/fonts/bariol) by [atipo foundry](http://atipofoundry.com/), located in /src/site/html/static/fonts. Proprietary license, used with permission. See http://atipofoundry.com/license, section "webfont license".
