# Mirror-workflows

Each branch mirrors a repo (easier to build with Actions than having one repo for each repo I want to mirror).

Actions synchronize the branches to repos, build Dockerfiles into images, and push these images to Docker Hub.

The Actions are defined in the directory .github/workflows. Secrets are used for sensitive information.

### Branches currently working:

- Feedropolis
- Spreed
- TGTG (TooGoodToGo, but the creator accepted my pull request and supports arm, so I don't maintain this)
- TT-RSS
