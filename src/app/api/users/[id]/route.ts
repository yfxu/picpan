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
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await request.json()
  const password = typeof body?.password === "string" ? body.password : undefined
  const role = body?.role === "ADMIN" || body?.role === "USER" ? body.role : undefined

  const data: { passwordHash?: string; role?: "ADMIN" | "USER" } = {}

  if (password !== undefined) {
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }
    data.passwordHash = await bcrypt.hash(password, 12)
  }

  if (role !== undefined && role !== target.role) {
    // Prevent removing the last admin
    if (target.role === "ADMIN" && role === "USER") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } })
      if (adminCount <= 1) {
        return NextResponse.json({ error: "Cannot demote the last admin" }, { status: 400 })
      }
    }
    data.role = role
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, username: true, role: true, createdAt: true },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  if (id === session.user.id) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 })
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, _count: { select: { media: true, albums: true } } },
  })
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (target.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } })
    if (adminCount <= 1) {
      return NextResponse.json({ error: "Cannot delete the last admin" }, { status: 400 })
    }
  }

  if (target._count.media > 0 || target._count.albums > 0) {
    return NextResponse.json(
      { error: "This user still owns photos or albums. Remove them before deleting the account." },
      { status: 409 }
    )
  }

  await prisma.user.delete({ where: { id } })
  return new Response(null, { status: 204 })
}
