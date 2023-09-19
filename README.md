# Mirror-workflows

Each branch mirrors a repo's main (or master) branch (easier to build with Actions than having one repo for each repo I want to mirror).

Actions synchronize the branches to repos, build Dockerfiles into images, and push these images to Docker Hub.

The Actions are defined in the directory .github/workflows. Secrets are used for sensitive information.

### Branches currently working:

- ~Feedropolis~
- Spreed [![Sync+build+push Spreed](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20Spreed.yml/badge.svg)](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20Spreed.yml)
- TT-RSS [![Sync+build+push TTRSS](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20TTRSS.yml/badge.svg)](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20TTRSS.yml)
- ~Bibliogram~ (c.f. https://todo.sr.ht/~cadence/bibliogram-issues/51#event-174552) is discontinued :'(
- ~FindMyDeviceServer~ (bug)
- Mango [![Sync+build+push Mango](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20Mango.yml/badge.svg)](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20Mango.yml)
- Home-Assistant-Extra [![Sync+build+push Home-Assistant](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20Home-Assistant.yml/badge.svg)](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20Home-Assistant.yml)
- ~Nitter~ (bug)
- SimplyTranslate [![Sync+build+push SimplyTranslate](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20SimplyTranslate.yml/badge.svg)](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20SimplyTranslate.yml)
- ~Wikiless~ (original repository is gone temporarily for legal reasons)
- ~Quetre~
- Node-Red [![Sync+build+push Node-Red](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20Node-Red.yml/badge.svg)](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20Node-Red.yml)
- Web-whisper [![Sync+build+push Web-whisper](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20Web-whisper.yml/badge.svg)](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+build+push%20Web-whisper.yml)
- tt-rss-android (complete repo, not branch) [![Sync+Build+Release tt-rss-android](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+Build+Release%20tt-rss-android.yaml/badge.svg)](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync+Build+Release%20tt-rss-android.yaml)
- Infinity-For-Reddit (complete repo, not branch) [![Sync + Trigger Build+Release Infinity-For-Reddit](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync%20+%20Trigger%20Build+Release%20Infinity-For-Reddit.yml/badge.svg)](https://github.com/schklom/Mirror-workflows/actions/workflows/Sync%20+%20Trigger%20Build+Release%20Infinity-For-Reddit.yml) and [![Build](https://github.com/schklom/Infinity-For-Reddit/actions/workflows/build.yml/badge.svg)](https://github.com/schklom/Infinity-For-Reddit/actions/workflows/build.yml)

## Disclaimer
If people use my version of Infinity-For-Reddit (it is based on my username), i will change the parameters and make the repository private). Feel free to copy my setup, and use your own username and api keys. The details are in the Action yaml file, and you can ask me by opening issues.
