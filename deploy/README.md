# Public homelab deployment

The owner explicitly requested public access without a password on 2026-09-19. `https://jev.ninitux.com` is now anonymous; do not restore Basic Auth without a new owner instruction. The earlier protected deployment receipt in `artifacts/deployment/` is historical, not current access policy.

## Runtime

The app runs separately from DSH on VM118 (`site-and-git`) in container `jev-factory`. Backend: `192.168.0.207:18911`. Ingress LXC210 terminates HTTPS and proxies using `deploy/jev.ninitux.com.caddy`. Browser Authorization is stripped; the backend creates its own TypeSafe authorization header. HTTP redirects to HTTPS. Other sites are unchanged.

Current application image/source: `67ad76218d92c2427865b4c7a359d901ca159e03`. The later public-access change only alters Caddy; it does not require a new app image.

Runtime key: `/opt/jev-factory/secrets/runtime.env`, mode 0600, outside Git and image. Jev egress is fixed at `http://192.168.0.142:18080`. Never disclose the key.

The container runs as `node` with read-only root, dropped capabilities, no-new-privileges, 256 MiB memory/one CPU/64 PID limits, healthcheck and `unless-stopped` restart policy. Backend port is bound to the private LAN address; no router port forward was added. Existing main site is on port 18910.

## Public API & Uncapped Throughput

Anyone can now request classification. Local artificial caps (the 120 requests/minute throttle and 6-concurrency cap) have been removed per owner specification. The backend operates without local throttling; if the upstream TypeSafe AI service returns rate-limit signals (HTTP 429), they are propagated cleanly to the client. Input validation (8 KiB, length bounds) and repeat-query caching (up to 1,000 entries) remain in place.

## Release updates

Build a committed snapshot on VM118 with `Dockerfile`, tag `jev-factory:<full-git-sha>`, and run `deploy/compose.yaml` with `JEV_REVISION=<full-git-sha>`. Transfer via Git bundle, check out the exact revision, and exclude secrets from build input. Current release checkout is `/opt/jev-factory/releases/67ad76218d92c2427865b4c7a359d901ca159e03`.

## Verification

```sh
node scripts/verify-deployment.js
TEST_URL=https://jev.ninitux.com \
TEST_OUTPUT_DIR=artifacts/public-deployment \
node scripts/e2e_verify.js
```

No authentication file is needed. The browser suite makes real paid API calls. Check public root/catalog/texture responses, absence of WWW-Authenticate, HTTP redirect, trusted TLS, API response accounting, browser controls and the unchanged main site.

## Rollback

To withdraw only this site: remove `/etc/caddy/conf.d/jev.ninitux.com.caddy`, validate the root Caddyfile, gracefully reload Caddy, then stop only the Jev Compose service. The prior password configuration is retained at `/etc/caddy/conf.d/jev.ninitux.com.caddy.before-public`, but restoring authentication requires owner authorization. To roll back an app release, select the previous verified image tag and recreate only Jev. Never restart DSH or other containers.

## Rights

Texture redistribution rights are unresolved, especially Create assets marked All Rights Reserved. Public availability does not resolve licensing; see root README and source manifest. No legal clearance is asserted.
