import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../lib/auth"
import { prisma } from "../../../../../lib/prisma"

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const album = await prisma.album.findUnique({ where: { id, userId: session.user.id } })
  if (!album) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await request.json()
  const mediaIds: string[] = Array.isArray(body?.mediaIds) ? body.mediaIds : []

  await prisma.albumMedia.deleteMany({
    where: { albumId: id, mediaId: { in: mediaIds } },
  })

  return new NextResponse(null, { status: 204 })
}
