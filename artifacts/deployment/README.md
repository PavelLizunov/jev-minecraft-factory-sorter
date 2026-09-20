# Jev protected-domain deployment receipt

Date: 2026-09-19, Europe/Moscow.

## Deployed target

- URL: https://jev.ninitux.com/
- App source/image tag: `67ad76218d92c2427865b4c7a359d901ca159e03`.
- Node runtime: v22.23.2.
- Backend: VM118 site-and-git, container `jev-factory`, private LAN `192.168.0.207:18911`.
- Source checkout: `/opt/jev-factory/releases/67ad76218d92c2427865b4c7a359d901ca159e03`.
- Runtime secret: `/opt/jev-factory/secrets/runtime.env`, mode 0600; directory mode 0700. Values are not present in this receipt or image.
- Ingress: LXC210, `/etc/caddy/conf.d/jev.ninitux.com.caddy`. Entire host protected with HTTPS Basic auth; browser Authorization is stripped before proxying.
- Only Caddy was gracefully reloaded after successful configuration validation. DSH and the main site's container were not restarted.

## Observed deployment checks

The exact committed source was transferred using a Git bundle, cloned and checked out at its SHA on the target VM. Docker built the application successfully with frozen-lockfile dependency installation and Vite production compilation. Image base resolved to `node:22-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5` during this build; the Dockerfile tag itself remains mutable for future builds.

Container inspection confirmed: healthy, user `node`, read-only root, `unless-stopped`, 256 MiB memory limit, PID limit 64. Port binding is only on the private LAN address, not a new router forward. The existing `ninitux-landing` remained healthy with unchanged seven-day uptime.

`node scripts/verify-deployment.js` passed 11 assertions: anonymous root/API/data/texture requests denied; anonymous paid classification denied; wrong password denied; authenticated health returns 429 catalog entries and configured key; HTTP redirects to HTTPS; TLS validates without insecure overrides; main website responds HTTP 200.

Certificate: Let's Encrypt YE2, subject `jev.ninitux.com`, valid through 2026-12-17 20:59:23 UTC. Exact certificate evidence is in `https-auth-report.json`.

Authenticated domain E2E passed all 40 assertions with zero console/page/request errors and seven fresh live API responses. Under active cargo, 300 canvas frames measured 60.0024 FPS average and 16.7 ms p95. Browser evidence is recorded independently in `e2e-report.json`; the domain screenshot is `modded-factory-1080p.png` and was visually inspected. The test authenticates using a private JSON file, never command-line password arguments.

## Security review and limits

`security-review` / `change-verification` scope: Dockerfile, .dockerignore, Compose configuration, generated single-host Caddy route, credential transfer, and browser authentication input. Existing backend constraints remain as documented in the root README. Authentication was checked through the actual public URL with correct, absent and wrong credentials; no paid request was needed for negative authentication checks.

Credentials were generated/transferred without printing them. `.private/` is excluded from Git and Docker build context. The TypeSafe key is outside the image and source checkout. The generated access JSON is an intentional private owner deliverable, not a public artifact. Caddy stores only a bcrypt hash.

Basic auth is the public boundary; a trusted-LAN client can still reach the private backend directly. This deployment is not per-user authorization, centralized identity management or a guarantee against authenticated abuse. No router/firewall settings were changed. The restart policy was inspected; host reboot persistence was not disruption-tested. Independent reviewer acceptance was unavailable. Texture licenses remain unresolved for public redistribution, and a password is not a license grant.

## Rollback

Follow `deploy/README.md`: remove only the Jev virtual-host file, validate and gracefully reload Caddy, then stop only the `jev-factory` Compose service. Preserve other routes, containers, release files and secrets. No DSH action is needed.
