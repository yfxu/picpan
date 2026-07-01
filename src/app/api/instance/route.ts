import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../lib/auth"
import { prisma } from "../../../lib/prisma"

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const instance = await prisma.instance.findFirst()
  if (!instance) return NextResponse.json({ error: "Instance not configured" }, { status: 500 })

  const body = await request.json().catch(() => ({}))

  const data: {
    s3PublicBucket?: string | null
    cdnPublicBaseUrl?: string | null
    s3PublicEndpoint?: string | null
    s3PublicRegion?: string | null
    s3PublicAccessKey?: string | null
    s3PublicSecretKey?: string | null
    s3PublicProvider?: string | null
  } = {}

  // Plain string-or-null fields for the public bucket's own provider connection.
  const stringFields = [
    "s3PublicBucket",
    "s3PublicEndpoint",
    "s3PublicRegion",
    "s3PublicAccessKey",
    "s3PublicSecretKey",
    "s3PublicProvider",
  ] as const

  for (const field of stringFields) {
    if (field in body) {
      const v = body[field]
      if (v !== null && typeof v !== "string") {
        return NextResponse.json({ error: `${field} must be a string or null` }, { status: 400 })
      }
      data[field] = typeof v === "string" && v.trim() ? v.trim() : null
    }
  }

  if ("cdnPublicBaseUrl" in body) {
    const v = body.cdnPublicBaseUrl
    if (v !== null && typeof v !== "string") {
      return NextResponse.json({ error: "cdnPublicBaseUrl must be a string or null" }, { status: 400 })
    }
    const trimmed = typeof v === "string" ? v.trim().replace(/\/+$/, "") : ""
    if (trimmed && !/^https?:\/\//i.test(trimmed)) {
      return NextResponse.json({ error: "cdnPublicBaseUrl must start with http:// or https://" }, { status: 400 })
    }
    data.cdnPublicBaseUrl = trimmed || null
  }

  const updated = await prisma.instance.update({ where: { id: instance.id }, data })

  return NextResponse.json({
    s3PublicBucket: updated.s3PublicBucket,
    cdnPublicBaseUrl: updated.cdnPublicBaseUrl,
    s3PublicEndpoint: updated.s3PublicEndpoint,
    s3PublicRegion: updated.s3PublicRegion,
    s3PublicProvider: updated.s3PublicProvider,
    s3PublicAccessKeySet: Boolean(updated.s3PublicAccessKey),
    s3PublicSecretKeySet: Boolean(updated.s3PublicSecretKey),
  })
}
