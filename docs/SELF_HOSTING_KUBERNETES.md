# Self-hosting openGym on Kubernetes

Example manifests for a small cluster, contributed from a K3s setup with the Gateway API and
cert-manager. Read [SELF_HOSTING.md](SELF_HOSTING.md) first: the passkey requirement (HTTPS,
`RP_ID`, `ORIGIN`), the settings in `.env.example` and the backup advice apply here unchanged.

openGym is pretty simple — a frontend and an API backend. The API keeps everything in plain JSON
files on a volume. The Docker Compose file also has a third container that downloads the exercise
media once; here that is an initContainer. There are only a few resources to create:

- 2 PVCs: `opengym-data` (users, passkeys, workouts, uploads — **back this one up**) and
  `opengym-media` (the exercise images, downloaded again if lost).
- 1 Deployment running the API and the web container in a single pod, for simplicity. It stays at
  one replica with the `Recreate` strategy: the API's data is files on a `ReadWriteOnce` volume,
  and two API processes must never write them at once.
- An HTTPRoute (the example uses the Gateway API; an Ingress to the `opengym` Service on port 80
  works as well), plus a cert-manager Certificate for the hostname.

```bash
git clone https://github.com/DuarteSantos8/openGym   # or https://gitlab.com/DuarteSantos8/opengym — same repo
cd openGym
# In kubernetes/deployment.yaml, set RP_ID and ORIGIN in spec.template.spec.containers[api].env
# to your hostname, and the hostname in kubernetes/httproute.yaml.
kubectl apply -k kubernetes/
```

Notes:

- The manifests use the `fitness` namespace (`kubernetes/kustomization.yaml`) and a Gateway
  called `eg` in `envoy-gateway-system` with an `https` listener; change both to match your
  cluster. The Gateway has to terminate TLS; this was tested with
  [Envoy Gateway](https://gateway.envoyproxy.io) and [cert-manager](https://cert-manager.io).
- The images are the published `ghcr.io/duartesantos8/opengym-api` and `opengym-web`. The AI
  Coach with an API key works on that same API image; the Claude and Codex sign-in providers
  need the `coach` build target, which is not published — build it yourself (see
  [AI_COACH.md](AI_COACH.md)).
- Settings are environment variables on the `api` container, named as in `.env.example`. Keep
  secrets such as the push keys in a Kubernetes Secret and load them with `envFrom`.
