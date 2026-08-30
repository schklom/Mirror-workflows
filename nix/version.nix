# Single source of truth for the openGym release version and the pinned exercise-dataset
# commit the media packages (build-time media.nix and runtime media-script.nix) agreed on.
{
  version = "1.2.14";

  # hasaneyldrm/exercises-dataset — same commit for build-time fetch and runtime download.
  datasetRev = "7455efae41b330c265e7cd4b78dfa848e7ce5ebd";
}