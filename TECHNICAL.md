# Technical Overview

## Data Model

```prisma
User
  id           String   @id
  username     String   @unique
  passwordHash String
  role         Role     // ADMIN | USER
  createdAt    DateTime

Album
  id          String   @id
  name        String
  description String?
  coverId     String?  // FK -> Media.id
  published   Boolean  @default(false)
  createdAt   DateTime
  updatedAt   DateTime

AlbumUser (join)
  albumId  String
  userId   String
  role     AlbumRole  // OWNER | CONTRIBUTOR | VIEWER

Media
  id          String   @id
  uploadedBy  String   // FK -> User.id
  title       String?
  fileType    String
  keyOriginal String   // S3 object key
  keyMedium   String
  keySmall    String
  takenAt     DateTime?
  // EXIF fields inlined (make, model, lat, lng, etc.)
  createdAt   DateTime
  updatedAt   DateTime

AlbumMedia (join)
  albumId  String
  mediaId  String

Tag
  id   String @id
  name String @unique

MediaTag (join)
  mediaId String
  tagId   String

Instance (single-row config)
  id          String @id
  cdnBaseUrl  String
  s3Endpoint  String
  s3Region    String
  s3Bucket    String
  s3AccessKey String
  s3SecretKey String
  s3Provider  String   // label only, e.g. "b2" | "wasabi" | "r2" | "hetzner" | "other"

MigrationJob
  id              String   @id
  status          MigrationStatus // PENDING | RUNNING | VERIFYING | DONE | FAILED
  targetEndpoint  String
  targetRegion    String
  targetBucket    String
  targetAccessKey String
  targetSecretKey String
  totalObjects    Int?
  copiedObjects   Int      @default(0)
  failedObjects   Int      @default(0)
  startedAt       DateTime?
  completedAt     DateTime?
  errorLog        String?
```

---

## Auth

NextAuth with a credentials provider (username + password). Passwords are hashed with bcrypt server-side before storage. Sessions are JWT-based.

Admins can reset any user's password. This is an intentional tradeoff — it simplifies UX at the cost of true E2E encryption, which is acceptable given the trusted-admin model. Data is encrypted at rest in the bucket regardless.

Role hierarchy:
- **Instance admin** — manages users, resets passwords, configures storage
- **Album owner** — manages a specific album, adds contributors/viewers
- **Contributor** — can upload to an album
- **Viewer** — read-only access

---

## Upload Flow

1. Client sends file to `POST /api/media/upload`
2. Server validates auth and file type
3. Sharp generates three sizes synchronously:
   - `small` — 400px wide, used for album grid
   - `medium` — 1200px wide, used for lightbox/preview
   - `original` — stored as-is
4. All three are encrypted with AES-256-GCM using a server-side key before upload
5. All three are uploaded to S3 under deterministic keys: `/{userId}/{mediaId}/small.enc`, etc.
6. EXIF is parsed from the original before encryption (using `exifr`) and stored in Postgres
7. Media record is written to Postgres with the three S3 keys

Encryption key is derived from an env var (`ENCRYPTION_SECRET`). This is server-managed, not E2E — the tradeoff for enabling server-side thumbnail generation and admin password reset.

---

## CDN URL API

The `Instance` table stores a `cdnBaseUrl` (e.g. `https://cdn.yourdomain.com`). Every asset URL is constructed as:

```
{cdnBaseUrl}/{s3ObjectKey}
```

A public API endpoint returns CDN URLs for any published album:

```
GET /api/albums/:albumId/media
```

Response includes `urlSmall`, `urlMedium`, `urlOriginal` for each photo. This is what a personal website would consume to embed photos without any coupling to the storage backend.

Unpublished albums return 403 for unauthenticated requests.

---

## Encryption at Rest

- Algorithm: AES-256-GCM
- Key: derived server-side from `ENCRYPTION_SECRET` env var
- IV: randomly generated per file, prepended to the ciphertext blob before S3 upload
- Decryption happens in the API layer when serving files directly (non-CDN path)
- CDN path serves encrypted blobs — suitable only if the CDN is trusted (Cloudflare)

Note: if direct CDN serving of encrypted blobs is undesirable, the alternative is to generate pre-signed S3 URLs routed through the server for decryption. This is a config option to consider post-alpha.

---

## S3 Integration

Uses AWS SDK v3 (`@aws-sdk/client-s3`). Compatible with any S3-compatible backend by setting a custom endpoint:

```ts
const client = new S3Client({
  region: config.s3Region,
  endpoint: config.s3Endpoint, // omit for real AWS
  credentials: {
    accessKeyId: config.s3AccessKey,
    secretAccessKey: config.s3SecretKey,
  },
  forcePathStyle: true, // required for MinIO, B2, etc.
})
```

Tested targets: Cloudflare R2, Backblaze B2, MinIO, AWS S3.

---

## Instance Configuration

On first run, if no `Instance` row exists, the app redirects to a setup wizard at `/setup`. The wizard collects:
- Admin username + password
- S3 credentials + bucket
- CDN base URL

After setup, `/setup` is permanently disabled.

---

## Storage Provider Migration

The app is designed so the active S3 provider can be swapped (e.g. Backblaze B2 → Wasabi) without touching application logic or rewriting database rows. This works because object keys never encode provider-specific information — they're always `{userId}/{mediaId}/{size}.enc`. Only the bucket the key lives in changes.

### Design constraint this depends on

Object keys must stay provider-agnostic forever. Don't bake bucket names, region, or provider identifiers into keys. This is a one-way decision — retrofitting it later means rewriting every `Media` row's keys.

### Migration flow

1. **Admin enters new provider credentials** into a `MigrationJob` (status `PENDING`), without touching the live `Instance` config. The active provider keeps serving traffic.
2. **Dry-run count check** — list objects in the source bucket, show the admin how many objects / how much data will move, and a rough cost estimate (egress is generally the source provider's responsibility to charge, not the destination's).
3. **Admin confirms** — job moves to `RUNNING`. The app enters a maintenance mode that blocks new uploads (read access to existing albums can stay live, since those still resolve against the old bucket/CDN origin until cutover).
4. **Copy** — every object is streamed from source to destination, preserving keys exactly. This is implemented as a wrapper around `rclone copy` (or equivalent SDK-level looped copy if avoiding a binary dependency) rather than hand-rolled, since rclone already handles parallelism, multipart uploads, retries, and resumability. `copiedObjects` / `failedObjects` are updated as it progresses so the admin UI can show a progress bar.
5. **Verify** — status moves to `VERIFYING`. Compare object counts (and optionally checksums on a sample) between source and destination.
6. **Cutover** — on success, the `Instance` row's S3 credentials are atomically swapped to the new provider. Job status becomes `DONE`.
7. **Manual step: repoint CDN origin** — the admin needs to update Cloudflare's origin configuration to point at the new bucket's endpoint. This is not automated in alpha; the UI surfaces clear instructions (endpoint URL to paste into Cloudflare) once cutover completes.
8. **Decommission old bucket** — left to the admin, once they've confirmed the new setup works. The app doesn't auto-delete anything from the old provider.

### Failure handling

If the copy fails partway (`FAILED` status), the old `Instance` config is untouched and still serving traffic — nothing is broken for end users. The admin can resume the same `MigrationJob`, and the copy step skips objects already present at the destination (size/hash match) rather than re-copying everything.

### Cost expectations

Cross-provider migration almost always incurs the source provider's standard egress charge, since the bytes have to leave that provider's infrastructure to be copied. There's no way to avoid this when moving between two different companies' object storage (no provider-to-provider direct copy mechanism exists across vendors). For typical photo-album-scale data (a few hundred GB to a couple TB), this is a one-time cost of roughly single-digit to low-double-digit dollars, not something to architect around. Same-provider migrations (e.g. moving regions within R2) may support true server-side copy with no egress, which rclone will use automatically when available — but this isn't something to rely on for the general case.

---



```yaml
services:
  app:
    build: .
    env_file: .env
    ports:
      - "3000:3000"
    depends_on:
      - db

  db:
    image: postgres:16
    environment:
      POSTGRES_DB: photoapp
      POSTGRES_USER: photoapp
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

No Redis, no separate worker process — thumbnail generation is synchronous in the upload handler. This keeps the alpha deployment footprint minimal.
