import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../lib/auth"
import { prisma } from "../../../../../lib/prisma"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const media = await prisma.media.findUnique({ where: { id } })
  if (!media) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (media.userId !== session.user.id && session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await request.json()
  const albumIds: string[] = Array.isArray(body?.albumIds) ? body.albumIds : []
  if (albumIds.length === 0) return NextResponse.json({ count: 0 })

  // Verify all albums belong to the current user
  const owned = await prisma.album.findMany({
    where: { id: { in: albumIds }, userId: session.user.id },
    select: { id: true },
  })
  const ownedIds = owned.map((a) => a.id)

  const result = await prisma.albumMedia.createMany({
    data: ownedIds.map((albumId) => ({ albumId, mediaId: id })),
    skipDuplicates: true,
  })

  return NextResponse.json({ count: result.count })
}
