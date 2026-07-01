import { randomBytes } from "crypto"
import type { S3Client } from "@aws-sdk/client-s3"
import type { Instance, Media } from "../generated/prisma/client"
import { prisma } from "./prisma"
import { getObject, putPublicObject, deleteObject, providerUsesAcl } from "./s3"
import { decryptBuffer } from "./media-crypto"

// All three derivative sizes are published as plaintext JPEGs.
const SIZES = ["small", "medium", "original"] as const
type Size = (typeof SIZES)[number]

// cdnToken rotates on every publish, so a published object can never change
// under a given URL — safe to cache immutably and forever.
const PUBLIC_CACHE_CONTROL = "public, max-age=31536000, immutable"

export class CdnNotConfiguredError extends Error {
  constructor() {
    super("Public CDN is not configured. Set a public bucket and CDN URL in Server Configuration first.")
    this.name = "CdnNotConfiguredError"
  }
}

// The public bucket lives on its own provider with its own credentials, so all
// of those fields must be present for the CDN to be usable — not just the bucket
// name and CDN URL.
export function cdnConfigured(instance: Instance): boolean {
  return Boolean(
    instance.s3PublicBucket &&
    instance.cdnPublicBaseUrl &&
    instance.s3PublicEndpoint &&
    instance.s3PublicRegion &&
    instance.s3PublicAccessKey &&
    instance.s3PublicSecretKey
  )
}

export function publicObjectKey(token: string, size: Size): string {
  return `${token}/${size}.jpg`
}

export function cdnUrls(instance: Instance, token: string): Record<Size, string> | null {
  if (!instance.cdnPublicBaseUrl) return null
  const base = instance.cdnPublicBaseUrl.replace(/\/+$/, "")
  return {
    small: `${base}/${publicObjectKey(token, "small")}`,
    medium: `${base}/${publicObjectKey(token, "medium")}`,
    original: `${base}/${publicObjectKey(token, "original")}`,
  }
}

function ivFor(media: Media, size: Size): string {
  return size === "small" ? media.encIvSmall
    : size === "medium" ? media.encIvMedium
    : media.encIvOrig
}

// Idempotent: a media already on the CDN is left untouched. Decrypts each size
// from the private bucket and writes a plaintext JPEG to the public bucket under
// a fresh token, then flips the flag. Throws CdnNotConfiguredError if the public
// bucket/CDN URL aren't set.
export async function publishMedia(
  privateS3: S3Client,
  publicS3: S3Client,
  instance: Instance,
  media: Media
): Promise<Media> {
  if (media.cdnPublic) return media
  if (!cdnConfigured(instance)) throw new CdnNotConfiguredError()
  const publicBucket = instance.s3PublicBucket!
  const useAcl = providerUsesAcl(instance.s3PublicProvider)

  const token = randomBytes(16).toString("hex")

  try {
    for (const size of SIZES) {
      const encrypted = await getObject(privateS3, instance.s3Bucket, `${media.s3Key}/${size}.enc`)
      const plaintext = decryptBuffer(encrypted, media.encKey, ivFor(media, size))
      await putPublicObject(publicS3, publicBucket, publicObjectKey(token, size), plaintext, "image/jpeg", PUBLIC_CACHE_CONTROL, useAcl)
    }
  } catch (err) {
    // Don't leave half-written, untracked plaintext objects in the public bucket.
    await Promise.allSettled(SIZES.map((size) => deleteObject(publicS3, publicBucket, publicObjectKey(token, size))))
    throw err
  }

  return prisma.media.update({ where: { id: media.id }, data: { cdnPublic: true, cdnToken: token } })
}

// Idempotent: a media not on the CDN is left untouched. Removes the plaintext
// objects from the public bucket and clears the flag/token. Object deletion is
// best-effort — the DB flag is the source of truth, and stale public objects
// (if any) are unreachable once the token is cleared.
export async function unpublishMedia(publicS3: S3Client | null, instance: Instance, media: Media): Promise<Media> {
  if (!media.cdnPublic) return media

  // publicS3 is null when the CDN creds have since been cleared — we can no
  // longer reach the public bucket, but still clear the flag (source of truth).
  if (publicS3 && media.cdnToken && instance.s3PublicBucket) {
    const bucket = instance.s3PublicBucket
    await Promise.allSettled(
      SIZES.map((size) => deleteObject(publicS3, bucket, publicObjectKey(media.cdnToken!, size)))
    )
  }

  return prisma.media.update({ where: { id: media.id }, data: { cdnPublic: false, cdnToken: null } })
}
