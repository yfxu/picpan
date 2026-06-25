# Phase 1 — Core server + storage

- User auth (username + password, sessions/JWTs)
- Basic file upload → presigned S3 URL flow
- Thumbnail generation on the server after upload (forget client-side encryption for now, get the happy path working)
- Serve thumbnails + originals via CDN URL
- Docker Compose with Postgres + the app server

# Phase 2 — Album/tag/organization layer

- Albums, tags, metadata (EXIF parsing)
- Sharing/access control between users
- Admin abilities (user management, password reset)
- Public vs private albums

# Phase 3 — CDN URL API

- Clean API endpoint that returns thumbnail + full URLs for a given album or photo
- This is what your personal website would consume

# Phase 4 — Encryption at rest

- Encrypt files before writing to S3, decrypt on the way out
- Since you're trusting the server, keys can live server-side — simpler than client-side crypto
- At this point HTTPS + encrypted bucket = quite solid for your use case

# Phase 5 — Polish

- Mobile upload (PWA or simple mobile web is probably enough)
- Bulk import
- Setup wizard / sane defaults for first-time config