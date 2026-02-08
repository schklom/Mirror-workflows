# Mirror-workflows

## Disclaimer
If people use my version of Infinity-For-Reddit (it uses my username and api key), i will change the parameters and make the repository private). Feel free to copy my setup, and use your own username and api keys. The details are in the Action yaml file, and you can ask me by opening issues.

I maintain this repo in my spare time, mainly for myself. Not everything here is kept updated constantly, it's a best-effort situation. I also do not test all images I build, so if an image fails and I am not running it and seeing it fail, I will not notice, so let me know in an issue and I will do what I can.

## What does this repo do?
Each branch mirrors a repo's main (or master) branch (easier to build with Actions than having one repo for each repo I want to mirror).

Actions synchronize the branches to repos, build Dockerfiles into images, and push these images to Docker Hub.

A handful of Actions download an APK file (for Android) from an official website and releases it in a related repository: Tasker "Direct Purchase" version (without Google's Payment system to get a license) is at https://github.com/schklom/Tasker-apk, and Tasker's plugin Auto-Input is at https://github.com/schklom/AutoInput-apk.

## How often are images updated?
Images are only updated if the last recorded commits of the parent repositories (store in files) match the latest current ones at the build-time. This minimizes the frequency of updates that Docker hosts need to make whenever they check for updates, and avoids wasting lots of computations.

The Actions are defined in the directory .github/workflows. Secrets are used for sensitive information.

### Branches currently working:

- Duplicati-Dockerfile [![Sync+build+push Duplicati](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20Duplicati.yml/badge.svg)](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20Duplicati.yml)
- Protonmail-bridge [![Sync+build+push Spreed](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20Protonmail-bridge.yml/badge.svg)](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20Protonmail-bridge.yml)
- Spreed [![Sync+build+push Spreed](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20Spreed.yml/badge.svg)](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20Spreed.yml)
- TT-RSS [![Sync+build+push TTRSS](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20TTRSS.yml/badge.svg)](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20TTRSS.yml)
- Home-Assistant-Extra [![Sync+build+push Home-Assistant](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20Home-Assistant.yml/badge.svg)](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20Home-Assistant.yml) This has an opinonated change from Linuxserver's version, is heavier and doesn't respect PUID and PGID environment variables, but is much faster to launch on my machine (c.f. https://github.com/linuxserver/docker-homeassistant/issues/116)
- Node-Red [![Sync+build+push Node-Red](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20Node-Red.yml/badge.svg)](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20Node-Red.yml)
- Web-whisper [![Sync+build+push Web-whisper](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20Web-whisper.yml/badge.svg)](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20Web-whisper.yml)
- Infinity-For-Reddit (complete repo, not branch) [![Sync + Trigger Build+Release Infinity-For-Reddit](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync%20+%20Trigger%20Build+Release%20Infinity-For-Reddit.yml/badge.svg)](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync%20+%20Trigger%20Build+Release%20Infinity-For-Reddit.yml) and [![Build](https://github.com/schklom/Infinity-For-Reddit/actions/workflows/build.yml/badge.svg)](https://github.com/schklom/Infinity-For-Reddit/actions/workflows/build.yml)
- Matterbridge [![Sync+build+push Matterbridge](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20Matterbridge.yml/badge.svg)](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20Matterbridge.yml)
- FindMyDeviceServer [![Sync+build+push FindMyDeviceServer](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20FindMyDeviceServer.yml/badge.svg)](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20FindMyDeviceServer.yml) (developer has a Docker image for popular platforms now, https://gitlab.com/Nulide/findmydeviceserver. I will delete my image at some time, there is no point. See https://hub.docker.com/r/schklom/findmydeviceserver for how to move to the new image)
- SimplyTranslate [![Sync+build+push SimplyTranslateNEW](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20SimplyTranslateNEW.yml/badge.svg)](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20SimplyTranslateNEW.yml)
- Wikiless (original repository was forked) [![Sync+build+push Wikiless](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20Wikiless.yml/badge.svg)](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20Wikiless.yml)
- ~Feedropolis~
- ~Bibliogram~ (c.f. https://todo.sr.ht/~cadence/bibliogram-issues/51#event-174552) is discontinued :'(
- ~Quetre~
- ~Mango [![Sync+build+push Mango](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20Mango.yml/badge.svg)](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20Mango.yml)~ Archived as of March 23 2025
- ~Nitter~ (bug)
- tt-rss-android (complete repo, not branch) [![Sync+Build+Release tt-rss-android](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+Build+Release%20tt-rss-android.yaml/badge.svg)](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+Build+Release%20tt-rss-android.yaml) ~(Can be updated on Obtainium from https://srv.tt-rss.org/fdroid/updates/org.fox.ttrss.json with Override Source set to HTML)~
