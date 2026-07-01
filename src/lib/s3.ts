import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3"
import type { Instance } from "../generated/prisma/client"

export function createS3Client(instance: Instance): S3Client {
  return new S3Client({
    region: instance.s3Region,
    endpoint: instance.s3Endpoint,
    credentials: {
      accessKeyId: instance.s3AccessKey,
      secretAccessKey: instance.s3SecretKey,
    },
    forcePathStyle: true,
  })
}

// The public bucket has its own provider/credentials, fully independent of the
// private bucket (e.g. Wasabi private, Cloudflare R2 public). The public-serving
// key is scoped to only the public bucket so a leak can never reach the encrypted
// private bucket. Callers must ensure cdnConfigured(instance) is true first —
// these fields are non-null whenever the CDN is configured.
export function createPublicS3Client(instance: Instance): S3Client {
  return new S3Client({
    region: instance.s3PublicRegion!,
    endpoint: instance.s3PublicEndpoint!,
    credentials: {
      accessKeyId: instance.s3PublicAccessKey!,
      secretAccessKey: instance.s3PublicSecretKey!,
    },
    forcePathStyle: true,
  })
}

// R2 rejects object ACLs with NotImplemented; it serves public objects via
// bucket-level public access + a custom domain instead. Every other supported
// provider (AWS/B2/Wasabi/MinIO) honours ACL "public-read".
export function providerUsesAcl(provider: string | null | undefined): boolean {
  return !/r2/i.test(provider ?? "")
}

export async function getObject(
  client: S3Client,
  bucket: string,
  key: string
): Promise<Buffer> {
  const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
  const bytes = await res.Body!.transformToByteArray()
  return Buffer.from(bytes)
}

export async function deleteObject(
  client: S3Client,
  bucket: string,
  key: string
): Promise<void> {
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
}

export async function getBucketStorageBytes(client: S3Client, bucket: string): Promise<number> {
  let total = 0
  let token: string | undefined
  do {
    const res = await client.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }))
    for (const obj of res.Contents ?? []) total += obj.Size ?? 0
    token = res.NextContinuationToken
  } while (token)
  return total
}

export async function putObject(
  client: S3Client,
  bucket: string,
  key: string,
  body: Buffer
): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: "application/octet-stream",
    })
  )
}

// Writes a publicly-readable, long-cacheable object. Used for plaintext CDN
// derivatives. ACL "public-read" works on AWS/B2/Wasabi/MinIO; R2 rejects the
// ACL param with NotImplemented, so it must be omitted there (see
// providerUsesAcl) and the bucket exposed via public access + a custom domain.
export async function putPublicObject(
  client: S3Client,
  bucket: string,
  key: string,
  body: Buffer,
  contentType: string,
  cacheControl: string,
  useAcl: boolean
): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl,
      ...(useAcl ? { ACL: "public-read" as const } : {}),
    })
  )
}
