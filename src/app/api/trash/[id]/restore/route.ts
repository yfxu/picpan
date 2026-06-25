import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../lib/auth"
import { prisma } from "../../../../../lib/prisma"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const media = await prisma.media.findUnique({ where: { id } })
  if (!media || !media.deletedAt) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (media.userId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await prisma.media.update({ where: { id }, data: { deletedAt: null } })

  return new NextResponse(null, { status: 204 })
}
