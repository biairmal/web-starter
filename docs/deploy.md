# Deploying web-starter

One container image runs everywhere: a VPS next to identity with Docker Compose, or a Deployment
on Kubernetes or OpenShift (TRD 14, FE-NFR-7). It is configured only by environment variables.

## The image

```sh
docker build -t web-starter .
```

- Next.js standalone server on `node` over plain Alpine: about 190 MB unpacked, about 62 MB
  compressed. Nothing else is in it: no npm, no package manager, no source.
- Runs as UID 1001 in group 0. Its files are read-only and group-readable, so OpenShift's
  restricted SCC can run it under any UID.
- Needs no writable root filesystem. The only writable path is `/tmp` (Next.js's runtime cache
  goes there), so mount a `tmpfs`/`emptyDir` on `/tmp` and run with `read_only`/
  `readOnlyRootFilesystem`.
- Listens on port 3000 (`PORT`, `HOSTNAME=0.0.0.0`).
- Every variable in `.env.example` is checked at start. A missing or malformed one stops the
  container with exit code 1 and a message naming it.

## Health

| Endpoint           | Answers                                                                            | Use it for                              |
| ------------------ | ---------------------------------------------------------------------------------- | --------------------------------------- |
| `GET /api/healthz` | 200 while the process serves                                                       | Liveness, startup, Docker `HEALTHCHECK` |
| `GET /api/readyz`  | 200 while identity's `/readyz` answers within 1 s, else 503 `UPSTREAM_UNAVAILABLE` | Readiness                               |

A replica that cannot reach identity is taken out of the load balancer but not restarted.

## Environment

| Variable                                                                                                        | Notes                                                                      |
| --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `APP_URL`                                                                                                       | Public origin. Identity's `FRONTEND_URL` must be the same value.           |
| `IDENTITY_INTERNAL_URL`                                                                                         | Identity as the server reaches it (Compose service, cluster DNS).          |
| `IDENTITY_PUBLIC_URL`                                                                                           | Identity's public origin, for the Google redirect.                         |
| `SESSION_SECRET`                                                                                                | Secret. 32+ random bytes, base64 (`openssl rand -base64 32`).              |
| `SESSION_COOKIE_PREFIX`, `TRUSTED_PROXY_HOPS`, `NEXT_PUBLIC_DEFAULT_LOCALE`, `LOG_LEVEL`, `DEFAULT_TENANT_SLUG` | See `.env.example`. All read at runtime, so one image serves every client. |

`TRUSTED_PROXY_HOPS` is the number of proxies in front of the app that append to
`X-Forwarded-For`: 1 behind Caddy or one ingress controller.

**Rotating `SESSION_SECRET`:** set `NEW,OLD` and roll out; every replica then decrypts both and
encrypts with `NEW`. Remove `OLD` after 90 days, the longest a session lives (TRD 11.1).

## VPS: Docker Compose

`deploy/compose.yaml` runs Postgres, identity (migrate, API, worker), web-starter and Caddy, which
serves two sites with TLS: the app (`APP_DOMAIN`, default `app.localhost`) and identity's public
origin (`IDENTITY_DOMAIN`, default `id.localhost`). Caddy blocks identity's `/v1/internal`.

```sh
cp deploy/web.env.example deploy/web.env             # SESSION_SECRET, APP_URL, IDENTITY_PUBLIC_URL
cp deploy/identity.env.example deploy/identity.env   # email keys, SMTP, super admin, URLs
bash ../go-identity/scripts/gen-dev-keys.sh deploy/keys   # or copy the real signing keys there
APP_DOMAIN=app.client.com IDENTITY_DOMAIN=id.client.com \
  docker compose -f deploy/compose.yaml up -d
```

- `WEB_REPLICAS` (default 2) sets the number of web-starter containers. Caddy finds them through
  Compose DNS and sends requests to each in turn.
- `IMAGE`/`IMAGE_TAG` and `IDENTITY_IMAGE`/`IDENTITY_TAG` pick the images; `--build` builds this
  app from the repo.
- The filled-in `deploy/*.env` files and `deploy/keys/` are git-ignored. Never commit them.
- With the default `*.localhost` domains, Caddy uses its own local CA. Browsers warn until its
  root certificate is trusted: copy it out with
  `docker compose -f deploy/compose.yaml cp caddy:/data/caddy/pki/authorities/local/root.crt .`
  and add it to the system's trust store.

## Kubernetes and OpenShift: Helm

`deploy/helm/web-starter` is a small chart: Deployment, Service, ConfigMap, HPA, PDB, and an
Ingress or OpenShift Route. Install identity with its own chart (go-identity
`deploy/helm/identity`) first.

```sh
kubectl create secret generic web-starter-session \
  --from-literal=SESSION_SECRET="$(openssl rand -base64 32)"
helm install web deploy/helm/web-starter \
  --set image.tag=v0.1.0 \
  --set secret.existingSecret=web-starter-session \
  --set env.APP_URL=https://app.client.com \
  --set env.IDENTITY_INTERNAL_URL=http://identity-identity \
  --set env.IDENTITY_PUBLIC_URL=https://id.client.com \
  --set route.enabled=true --set route.host=app.client.com
```

On OpenShift use `--set route.kind=openshift --set route.tls.enabled=true`. The pod spec sets no
UID, so the restricted-v2 SCC assigns one.

The refresh lock is per process; two pods refreshing one session at the same moment are covered
by identity's `refresh_reuse_grace` (10 s, TRD 5.3, decision 3). There is no shared state, so any
replica count and the HPA work without sticky sessions.

## Checking a deployment

```sh
curl -fsS https://app.client.com/api/readyz      # {"data":{"status":"ready"}}
curl -sI https://app.client.com/sign-in | grep -i content-security-policy
```
