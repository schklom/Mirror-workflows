Tiny Tiny RSS (tt-rss)
======================

Tiny Tiny RSS (tt-rss) is a free, flexible, open-source, web-based news feed (RSS/Atom/other) reader and aggregator.

## Getting started

Please refer to [the wiki](https://github.com/supahgreg/tt-rss/wiki).

## Some notes about this project

* The original tt-rss project, hosted at https://tt-rss.org/ and its various subdomains, [will be gone after 2025-11-01](https://community.tt-rss.org/t/the-end-of-tt-rss-org/7164).
  * Massive thanks to fox for creating tt-rss, and maintaining it (and absolutely everything else that went along with it) for so many years.
* This project (https://github.com/supahgreg/tt-rss) is a fork of tt-rss as of 2025-10-03, created by one of its long-time contributors (`wn_`/`wn_name` on `tt-rss.org`, `supahgreg` on `github.com`).
  * The goal is to continue tt-rss development, with an initial focus on replacing `tt-rss.org` references and integrations + getting things working.
  * Developer note: Due to use of `invalid@email.com` on `supahgreg`'s pre-2025-10-03 commits (which were done on `tt-rss.org`) GitHub incorrectly shows `ivanivanov884`
    (the GitHub user associated with that e-mail address) instead of `wn_`/`supahgreg`.  Apologies for any confusion.  `¯\_(ツ)_/¯`
* Plugins that were under https://gitlab.tt-rss.org/tt-rss/plugins have been mirrored to `https://github.com/supahgreg/tt-rss-plugin-*`.
  * Plugin repository names have changed to get a consistent `tt-rss-plugin-*` prefix.
* Documentation from https://tt-rss.org has recreated in https://github.com/supahgreg/tt-rss/wiki .
  * The repository that held the content for https://tt-rss.org was mirrored to https://github.com/supahgreg/tt-rss-web-static .
    Some content tweaks were made after mirroring (prior to the wiki being set up), and the repository is now archived.
* Docker images are being built and published to Docker Hub [via GitHub Actions](https://github.com/supahgreg/tt-rss/actions/workflows/publish.yml).
  * See https://hub.docker.com/r/supahgreg/tt-rss/ and https://hub.docker.com/r/supahgreg/tt-rss-web-nginx/ , and
    [the installation guide](https://github.com/supahgreg/tt-rss/wiki/Installation-Guide) for how they can be used.

## Development and contributing

* Contributions (code, translations, reporting issues, etc.) are welcome.
* Development and issue tracking primarily happens in https://github.com/supahgreg/tt-rss .
* (not quite ready for this post-`tt-rss.org`) ~~Help translate tt-rss into your own language using [Weblate](https://hosted.weblate.org/engage/tt-rss/)~~

## License

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.

Copyright (c) 2005 Andrew Dolgov (unless explicitly stated otherwise).
