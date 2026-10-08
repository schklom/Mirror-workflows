{
  fetchFromGitHub,
  datasetRev,
}:

fetchFromGitHub {
  owner = "hasaneyldrm";
  repo = "exercises-dataset";
  rev = datasetRev;
  hash = "sha256-bAit6zzd1Q1SPgb3ydjuZN78yXjRcgcIs+hH4gKNaxE=";
  name = "opengym-exercise-media";
}