import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"
import { createPublicS3Client } from "../../../../lib/s3"
import { unpublishMedia, cdnConfigured } from "../../../../lib/media-cdn"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const media = await prisma.media.findUnique({ where: { id } })
  if (!media || media.deletedAt) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (media.userId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // A trashed photo must not stay live on the CDN.
  if (media.cdnPublic) {
    const instance = await prisma.instance.findFirst()
    if (instance) {
      const publicS3 = cdnConfigured(instance) ? createPublicS3Client(instance) : null
      await unpublishMedia(publicS3, instance, media)
    }
  }

  await prisma.media.update({ where: { id }, data: { deletedAt: new Date() } })

  return new NextResponse(null, { status: 204 })
}
