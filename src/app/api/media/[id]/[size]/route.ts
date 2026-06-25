import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../lib/auth"
import { prisma } from "../../../../../lib/prisma"
import { createS3Client, getObject } from "../../../../../lib/s3"
import { decryptBuffer } from "../../../../../lib/media-crypto"
import { albumAccessCookieName, verifyAlbumAccessCookie } from "../../../../../lib/album-access"

type Size = "small" | "medium" | "original"
const VALID_SIZES = new Set<string>(["small", "medium", "original"])

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; size: string }> }
) {
  const { id, size } = await params

  if (!VALID_SIZES.has(size)) {
    return NextResponse.json({ error: "Invalid size" }, { status: 400 })
  }

  const session = await getServerSession(authOptions)

  const media = await prisma.media.findUnique({
    where: { id },
    include: {
      albums: {
        include: { album: { select: { id: true, isPublic: true, passwordHash: true } } },
      },
    },
  })
  if (!media || media.deletedAt) return NextResponse.json({ error: "Not found" }, { status: 404 })

  let authorized = false
  let isPublicAccess = false

  if (session && (media.userId === session.user.id || session.user.role === "ADMIN")) {
    authorized = true
  } else {
    const publicAlbum = media.albums.map((am) => am.album).find((a) => a.isPublic)
    if (publicAlbum) {
      if (!publicAlbum.passwordHash) {
        authorized = true
        isPublicAccess = true
      } else {
        const cookieValue = request.cookies.get(albumAccessCookieName(publicAlbum.id))?.value
        if (verifyAlbumAccessCookie(publicAlbum.id, publicAlbum.passwordHash, cookieValue)) {
          authorized = true
          isPublicAccess = true
        }
      }
    }
  }

  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const instance = await prisma.instance.findFirst()
  if (!instance) return NextResponse.json({ error: "Instance not configured" }, { status: 500 })

  const iv =
    size === "small" ? media.encIvSmall
    : size === "medium" ? media.encIvMedium
    : media.encIvOrig

  const s3 = createS3Client(instance)
  const encrypted = await getObject(s3, instance.s3Bucket, `${media.s3Key}/${size}.enc`)
  const plaintext = decryptBuffer(encrypted, media.encKey, iv)

  return new Response(plaintext, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": isPublicAccess ? "public, max-age=3600" : "private, max-age=3600",
    },
  })
}
