Tiny Tiny RSS (tt-rss)
======================

Web-based news feed aggregator, designed to allow you to read news from
any location, while feeling as close to a real desktop application as possible.

## Some notes

* The original tt-rss project, hosted at https://tt-rss.org/ and its various subdomains, [will be gone after 2025-11-01](https://community.tt-rss.org/t/the-end-of-tt-rss-org/7164).
  * Massive thanks to fox for maintaining tt-rss (and absolutely everything else that went along with it) for so many years.
* https://github.com/supahgreg/tt-rss is a fork of tt-rss as of 2025-10-03, created by one of its long-time contributors (`wn_`/`wn_name` on `tt-rss.org`, `supahgreg` on `github.com`).
  * For now, just treat this as a slightly-tweaked mirror of the original project (initially just removing `tt-rss.org` references and integrations + getting things working).
  * Due to use of `invalid@email.com` on my pre-2025-10-03 commits GitHub incorrectly shows `ivanivanov884` (the GitHub user associated with that e-mail address) as the committer.  Oops. `¯\_(ツ)_/¯`
* Plugins that were under https://gitlab.tt-rss.org/tt-rss/plugins have been mirrored to `https://github.com/supahgreg/tt-rss-plugin-*` (NOTE: repo names have changed to get a consistent `tt-rss-plugin-*` prefix).
* Documentation from https://tt-rss.org has recreated in https://github.com/supahgreg/tt-rss/wiki .
  * If needed, the repository that held the content for https://tt-rss.org has been mirrored to https://github.com/supahgreg/tt-rss-web-static .  Some content tweaks were made after mirroring and prior to the wiki being set up.
* Docker images are being published to Docker Hub-- see https://hub.docker.com/r/supahgreg/tt-rss/tags and https://hub.docker.com/r/supahgreg/tt-rss-web-nginx/tags .

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
