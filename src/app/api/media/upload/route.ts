import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import sharp from "sharp"
import { randomUUID, createHash } from "crypto"
import ExifReader from "exifr"
import { authOptions } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"
import { createS3Client, putObject, deleteObject } from "../../../../lib/s3"
import { generateKey, generateIv, encryptBuffer } from "../../../../lib/media-crypto"

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"])

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userExists = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true } })
  if (!userExists) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const instance = await prisma.instance.findFirst()
  if (!instance) return NextResponse.json({ error: "Instance not configured" }, { status: 500 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: "Invalid multipart data" }, { status: 400 })
  }

  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer())
  const contentHash = createHash("sha256").update(fileBuffer).digest("hex")

  const existing = await prisma.media.findFirst({
    where: { userId: session.user.id, contentHash, deletedAt: null },
    select: { id: true },
  })
  if (existing) return NextResponse.json({ mediaId: existing.id })

  // Extract EXIF before Sharp strips it during rotation
  let takenAt: Date | null = null
  try {
    const exif = await ExifReader.parse(fileBuffer, { pick: ["DateTimeOriginal", "DateTimeDigitized"] })
    takenAt = exif?.DateTimeOriginal ?? exif?.DateTimeDigitized ?? null
  } catch { /* non-fatal: file may have no EXIF */ }

  // Fall back to client-reported lastModified if no EXIF date
  if (!takenAt) {
    const lastModifiedRaw = formData.get("lastModified")
    const lastModifiedMs = lastModifiedRaw ? Number(lastModifiedRaw) : NaN
    if (!isNaN(lastModifiedMs) && lastModifiedMs > 0) {
      takenAt = new Date(lastModifiedMs)
    }
  }

  // Rotate once: applies EXIF orientation, strips the tag, gives correct output dimensions.
  const { data: rotatedBuf, info: rotatedInfo } = await sharp(fileBuffer).rotate().toBuffer({ resolveWithObject: true })
  const origWidth = rotatedInfo.width
  const origHeight = rotatedInfo.height
  const mediaId = randomUUID()
  const s3Key = `${session.user.id}/${mediaId}`
  const encKey = generateKey()
  const encIvSmall = generateIv()
  const encIvMedium = generateIv()
  const encIvOrig = generateIv()
  const s3 = createS3Client(instance)

  try {
    const smallBuf = await sharp(rotatedBuf)
      .resize({ width: 300, height: 300, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer()
    await putObject(s3, instance.s3Bucket, `${s3Key}/small.enc`, encryptBuffer(smallBuf, encKey, encIvSmall))

    const mediumBuf = await sharp(rotatedBuf)
      .resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer()
    await putObject(s3, instance.s3Bucket, `${s3Key}/medium.enc`, encryptBuffer(mediumBuf, encKey, encIvMedium))

    const origBuf = await sharp(rotatedBuf)
      .jpeg({ quality: 90 })
      .toBuffer()
    await putObject(s3, instance.s3Bucket, `${s3Key}/original.enc`, encryptBuffer(origBuf, encKey, encIvOrig))
  } catch (err) {
    console.error("Upload failed:", err)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }

  try {
    await prisma.media.create({
      data: {
        id: mediaId,
        userId: session.user.id,
        contentHash,
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        s3Key,
        encKey,
        encIvSmall,
        encIvMedium,
        encIvOrig,
        width: origWidth,
        height: origHeight,
        takenAt,
      },
    })
  } catch (err) {
    console.error("DB insert failed, cleaning up S3 objects:", err)
    await Promise.allSettled([
      deleteObject(s3, instance.s3Bucket, `${s3Key}/small.enc`),
      deleteObject(s3, instance.s3Bucket, `${s3Key}/medium.enc`),
      deleteObject(s3, instance.s3Bucket, `${s3Key}/original.enc`),
    ])
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }

  return NextResponse.json({ mediaId })
}
