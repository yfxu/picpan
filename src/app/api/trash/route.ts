import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../lib/auth"
import { prisma } from "../../../lib/prisma"
import { createS3Client, deleteObject } from "../../../lib/s3"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const items = await prisma.media.findMany({
    where: { userId: session.user.id, deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    select: { id: true, width: true, height: true, filename: true, deletedAt: true },
  })

  return NextResponse.json(items)
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const instance = await prisma.instance.findFirst()
  if (!instance) return NextResponse.json({ error: "Instance not configured" }, { status: 500 })

  const body = await request.json().catch(() => ({}))
  const force = body?.force === true

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - instance.trashRetentionDays)

  const items = await prisma.media.findMany({
    where: {
      userId: session.user.id,
      deletedAt: force ? { not: null } : { lte: cutoff },
    },
    select: { id: true, s3Key: true },
  })

  if (items.length === 0) return NextResponse.json({ deleted: 0 })

  const s3 = createS3Client(instance)
  await Promise.allSettled(
    items.flatMap((item) => [
      deleteObject(s3, instance.s3Bucket, `${item.s3Key}/small.enc`),
      deleteObject(s3, instance.s3Bucket, `${item.s3Key}/medium.enc`),
      deleteObject(s3, instance.s3Bucket, `${item.s3Key}/original.enc`),
    ])
  )

  await prisma.media.deleteMany({ where: { id: { in: items.map((i) => i.id) } } })

  return NextResponse.json({ deleted: items.length })
}
