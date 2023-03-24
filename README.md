# Mirror-workflows

Each branch mirrors a repo (easier to build with Actions than having one repo for each repo I want to mirror).

Actions synchronize the branches to repos, build Dockerfiles into images, and push these images to Docker Hub.

The Actions are defined in the directory .github/workflows. Secrets are used for sensitive information.

### Branches currently working:

- Feedropolis
- Spreed
- TT-RSS
- ~Bibliogram~ (c.f. https://todo.sr.ht/~cadence/bibliogram-issues/51#event-174552)
- ~FindMyDeviceServer~ (bug)
- Mango
- Home-Assistant-Extra
- Nitter
- SimplyTranslate
- ~Wikiless~ (original repository is gone temporarily for legal reasons)
- ~Quetre~
