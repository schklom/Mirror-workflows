# Mirror-workflows

***DISCLAIMER***: I maintain this README and repo in my spare time, mainly for myself. Not everything here is kept updated constantly, it's a best-effort situation. I also do not test all images I build, so if an image fails and I am not running it and seeing it fail, I will not notice, so let me know in an issue and I will do what I can.

Each branch mirrors a repo's main (or master) branch (easier to build with Actions than having one repo for each repo I want to mirror).

Actions synchronize the branches to repos, build Dockerfiles into images, and push these images to Docker Hub.

Images are only updated if the last recorded commits of the parent repositories (store in files) match the latest current ones at the build-time. This minimizes the frequency of updates that Docker hosts need to make whenever they check for updates, and avoids wasting lots of computations.

The Actions are defined in the directory .github/workflows. Secrets are used for sensitive information.

### Branches currently working:

- Protonmail-bridge [![Sync+build+push Spreed](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20Protonmail-bridge.yml/badge.svg)](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20Protonmail-bridge.yml)
- Spreed [![Sync+build+push Spreed](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20Spreed.yml/badge.svg)](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20Spreed.yml)
- TT-RSS [![Sync+build+push TTRSS](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20TTRSS.yml/badge.svg)](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20TTRSS.yml)
- Mango [![Sync+build+push Mango](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20Mango.yml/badge.svg)](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20Mango.yml)
- Home-Assistant-Extra [![Sync+build+push Home-Assistant](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20Home-Assistant.yml/badge.svg)](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20Home-Assistant.yml) This has an opinonated change from Linuxserver's version, is heavier and doesn't respect PUID and PGID environment variables, but is much faster to launch on my machine (c.f. https://github.com/linuxserver/docker-homeassistant/issues/116)
- Node-Red [![Sync+build+push Node-Red](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20Node-Red.yml/badge.svg)](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20Node-Red.yml)
- Web-whisper [![Sync+build+push Web-whisper](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20Web-whisper.yml/badge.svg)](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20Web-whisper.yml)
- Infinity-For-Reddit (complete repo, not branch) [![Sync + Trigger Build+Release Infinity-For-Reddit](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync%20+%20Trigger%20Build+Release%20Infinity-For-Reddit.yml/badge.svg)](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync%20+%20Trigger%20Build+Release%20Infinity-For-Reddit.yml) and [![Build](https://github.com/schklom/Infinity-For-Reddit/actions/workflows/build.yml/badge.svg)](https://github.com/schklom/Infinity-For-Reddit/actions/workflows/build.yml)
- ~Feedropolis~
- ~Bibliogram~ (c.f. https://todo.sr.ht/~cadence/bibliogram-issues/51#event-174552) is discontinued :'(
- ~FindMyDeviceServer~ (developer has a Docker image for popular platforms now, https://gitlab.com/Nulide/findmydeviceserver. I will delete my image at some time, there is no point. See https://hub.docker.com/r/schklom/findmydeviceserver for how to move to the new image)
- ~Nitter~ (bug)
- ~SimplyTranslate [![Sync+build+push SimplyTranslate](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20SimplyTranslate.yml/badge.svg)](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20SimplyTranslate.yml)~
- ~Wikiless~ (original repository is gone temporarily for legal reasons)
- ~Quetre~
- ~tt-rss-android (complete repo, not branch)~ (Can be updated on Obtainium from https://srv.tt-rss.org/fdroid/updates/org.fox.ttrss.json with Override Source set to HTML)


## Disclaimer
If people use my version of Infinity-For-Reddit (it uses my username and api key), i will change the parameters and make the repository private). Feel free to copy my setup, and use your own username and api keys. The details are in the Action yaml file, and you can ask me by opening issues.
