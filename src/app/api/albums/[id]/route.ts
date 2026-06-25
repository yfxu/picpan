import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import bcrypt from "bcryptjs"
import { authOptions } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const album = await prisma.album.findUnique({ where: { id } })
  if (!album) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (album.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await request.json()
  const { isPublic, password } = body

  let passwordHash: string | null | undefined = undefined
  if (typeof password === "string" && password.length > 0) {
    passwordHash = await bcrypt.hash(password, 10)
  } else if (password === null) {
    passwordHash = null
  }

  const updated = await prisma.album.update({
    where: { id },
    data: {
      isPublic: typeof isPublic === "boolean" ? isPublic : undefined,
      ...(passwordHash !== undefined ? { passwordHash } : {}),
    },
  })

  return NextResponse.json({ id: updated.id, isPublic: updated.isPublic, hasPassword: updated.passwordHash !== null })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const album = await prisma.album.findUnique({ where: { id } })
  if (!album) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (album.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  // AlbumMedia records cascade-delete automatically via the schema relation
  await prisma.album.delete({ where: { id } })
  return new Response(null, { status: 204 })
}
