# [Bibliogram](https://bibliogram.art)

## An alternative front-end for Instagram.

Bibliogram works without client-side JavaScript, has no ads or tracking, and doesn't urge you to sign up.

See also: [Invidious, a front-end for YouTube.](https://github.com/omarroth/invidious)

Join the Bibliogram discussion room on Matrix: [#bibliogram:matrix.org](https://riot.im/app/#/room/#bibliogram:matrix.org)

## Features

- [x] View profile and timeline
- [x] Infinite scroll
- [x] User memory cache
- [x] RSS (latest 12 posts)
- [x] View post
- [x] Galleries
- [x] Homepage
- [x] Videos
- [x] Galleries of videos
- [x] Optimised for mobile
- [x] Instance list
- [x] Clickable usernames and hashtags
- [x] Proper error checking
- [ ] Image disk cache
- [ ] Favicon
- [ ] Settings (e.g. data saving)
- [ ] List view
- [ ] IGTV
- [ ] Test suite
- [ ] Rate limiting
- [ ] Public API
- [ ] Explore hashtags
- [ ] Explore locations
- [ ] _more...?_

These features may not be able to be implemented for technical reasons:

- Stories

These features will not be added, unless you ask _reallllly_ nicely:

- Comments
- Tagging users

These features will not be added, and I will not investigate adding them:

- Viewing or interacting with a private profile's timeline

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

See [Wiki:Installing](https://github.com/cloudrac3r/bibliogram/wiki/Installing) and [Wiki:Configuring](https://github.com/cloudrac3r/bibliogram/wiki/Configuring) for more details. Problems? [Wiki:Troubleshooting](https://github.com/cloudrac3r/bibliogram/wiki/Troubleshooting)

## User-facing endpoints

- `/` - homepage
- `/u/{username}` - load a user's profile and timeline
- `/u/{username}/rss.xml` - get the RSS feed for a user
- `/u/{username}/atom.xml` - get the Atom feed for a user
- `/p/{shortcode}` - load a post
- `/privacy` - privacy policy

## Credits & license information

Site banner by [TheFrenchGhosty](https://gitlab.com/TheFrenchGhosty), [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)

Site font is [Bariol](http://atipofoundry.com/fonts/bariol) by [atipo foundry](http://atipofoundry.com/), located in /src/site/html/static/fonts. Proprietary license, used with permission. See http://atipofoundry.com/license, section "webfont license".
