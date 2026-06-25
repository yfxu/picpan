import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import bcrypt from "bcryptjs"
import { prisma } from "../../../../../lib/prisma"
import { albumAccessCookieName, computeAlbumAccessToken } from "../../../../../lib/album-access"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { password } = await request.json()

  const album = await prisma.album.findUnique({ where: { id } })
  if (!album || !album.isPublic || !album.passwordHash) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const valid = await bcrypt.compare(password, album.passwordHash)
  if (!valid) return NextResponse.json({ error: "Wrong password" }, { status: 401 })

  const token = computeAlbumAccessToken(id, album.passwordHash)
  const cookieStore = await cookies()
  cookieStore.set(albumAccessCookieName(id), token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  })

  return NextResponse.json({ ok: true })
}
