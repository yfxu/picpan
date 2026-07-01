import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"
import { createS3Client, createPublicS3Client } from "../../../../lib/s3"
import { publishMedia, unpublishMedia, cdnConfigured, cdnUrls } from "../../../../lib/media-cdn"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const mediaIds: unknown = body?.mediaIds
  const action: unknown = body?.action

  if (!Array.isArray(mediaIds) || mediaIds.some((id) => typeof id !== "string") || mediaIds.length === 0) {
    return NextResponse.json({ error: "mediaIds must be a non-empty string array" }, { status: 400 })
  }
  if (action !== "publish" && action !== "unpublish") {
    return NextResponse.json({ error: "action must be 'publish' or 'unpublish'" }, { status: 400 })
  }

  const instance = await prisma.instance.findFirst()
  if (!instance) return NextResponse.json({ error: "Instance not configured" }, { status: 500 })

  if (action === "publish" && !cdnConfigured(instance)) {
    return NextResponse.json(
      { error: "Public CDN is not configured. Set a public bucket and CDN URL in Server Configuration first." },
      { status: 400 }
    )
  }

  // Only operate on media the caller owns (admins may act on any).
  const items = await prisma.media.findMany({
    where: {
      id: { in: mediaIds as string[] },
      deletedAt: null,
      ...(session.user.role === "ADMIN" ? {} : { userId: session.user.id }),
    },
  })

  const s3 = createS3Client(instance)
  const publicS3 = cdnConfigured(instance) ? createPublicS3Client(instance) : null
  const updated: Array<{ id: string; cdnPublic: boolean; urls: Record<string, string> | null }> = []
  const failed: Array<{ id: string; error: string }> = []

  for (const media of items) {
    try {
      const result = action === "publish"
        ? await publishMedia(s3, publicS3!, instance, media)
        : await unpublishMedia(publicS3, instance, media)
      updated.push({
        id: result.id,
        cdnPublic: result.cdnPublic,
        urls: result.cdnPublic && result.cdnToken ? cdnUrls(instance, result.cdnToken) : null,
      })
    } catch (err) {
      console.error(`CDN ${action} failed for media ${media.id}:`, err)
      failed.push({ id: media.id, error: "operation failed" })
    }
  }

  return NextResponse.json({ updated, failed })
}
