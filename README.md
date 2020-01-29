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
- [ ] Videos
- [ ] Galleries of videos
- [ ] Image disk cache
- [ ] Clickable usernames and hashtags
- [ ] Instance list
- [ ] Proper error checking
- [ ] Optimised for mobile
- [ ] Favicon
- [ ] Settings (e.g. data saving)
- [ ] List view
- [ ] IGTV
- [ ] Test suite
- [ ] Rate limiting
- [ ] Public API
- [ ] Explore hashtags
- [ ] Explore locations
- [ ] _more..._

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

You need [node.js](https://nodejs.org/en/) to run Bibliogram. Versions before 12.13.0 are untested.

1. `$ git clone https://github.com/cloudrac3r/bibliogram`  
If you are using a fork, be sure to actually install that fork instead!
1. `$ npm install`
1. Edit `/config.js` to suit your server environment
1. `$ npm start`

Bibliogram is now running on `0.0.0.0:10407`.

## User-facing endpoints

- `/` - homepage
- `/u/{username}` - load a user's profile and timeline
- `/u/{username}/rss.xml` - get the RSS feed for a user
- `/p/{shortcode}` - load a post

## Credits

Site banner by [TheFrenchGhosty](https://gitlab.com/TheFrenchGhosty), [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)
