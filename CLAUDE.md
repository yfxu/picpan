# CLAUDE.md

## What this is

A self-hostable photo album manager built for technical users who want to store photos in their own S3-compatible bucket and serve them via a CDN. The admin hosts the server, manages accounts, and shares access with family/friends. Nobody needs to trust a third-party cloud service with their photos.

## How it differs from existing tools

- **Immich** — no native S3 support (community forks only), no CDN URL API
- **Ente** — fully E2E encrypted which makes server-side thumbnail generation impossible; more complex to self-host
- **PhotoPrism** — local storage only, known auth issues around direct asset access
- **ChronoFrame** — S3-native but young, no encryption, limited organization features

This project is S3-native from day one, generates thumbnails server-side, stores all assets encrypted at rest, and exposes a clean CDN URL API so photos can be embedded on external sites.

## Who it's for

A technically literate person who wants to:
- Own their photo storage (no Google Photos, iCloud, etc.)
- Share a private album server with family/friends
- Embed photos/thumbnails on a personal website via CDN URLs
- Run the whole thing with a single `docker compose up`

Non-technical end users are a non-goal for the initial version.

## Core goals

- **No homelab required.** The app should run entirely on rented infrastructure — a cheap VPS plus a cloud object storage bucket. Owning physical storage (NAS, home server) is explicitly not a requirement, though it's still supported as a deployment option.
- **Minimize cost.** Object storage (not block storage, not local disk) is the default storage model because it's the cheapest way to get durable, replicated storage without managing hardware. The storage backend is provider-agnostic so users can pick whichever S3-compatible provider is cheapest for their situation (Backblaze B2, Wasabi, Cloudflare R2, Hetzner Object Storage, etc.) and switch later without re-architecting anything.

## Stack

- **Next.js** — frontend + API routes
- **Prisma + Postgres** — metadata, users, albums, tags
- **Sharp** — server-side thumbnail generation (small / medium / original)
- **AWS SDK v3** — S3 operations (compatible with B2, R2, MinIO, Wasabi, Hetzner, etc.)
- **NextAuth** — authentication
- **Docker Compose** — Postgres + app server, single-command deployment

## Storage provider portability

Object keys are stored with no provider-specific prefixes (e.g. `{userId}/{mediaId}/small.enc`), so the same key works in any bucket regardless of backend. Switching providers (e.g. B2 → Wasabi) is a one-time copy-and-cutover migration, not a re-architecture. See TECHNICAL.md for the migration flow.

## Deployment targets

- **VPS** — Docker Compose + Caddy (automatic HTTPS)
- **Home server** — Docker Compose + Cloudflare Tunnel (no port forwarding required)
