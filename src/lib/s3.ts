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
