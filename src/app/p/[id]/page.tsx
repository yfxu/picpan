import { notFound } from "next/navigation"
import { cookies } from "next/headers"
import { prisma } from "../../../lib/prisma"
import { albumAccessCookieName, verifyAlbumAccessCookie } from "../../../lib/album-access"
import PublicAlbumGate from "./PublicAlbumGate"
import PublicPhotoGrid from "./PublicPhotoGrid"

export default async function PublicAlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const album = await prisma.album.findUnique({
    where: { id },
    include: {
      media: {
        orderBy: { media: { takenAt: { sort: "desc", nulls: "last" } } },
        select: { media: { select: { id: true, width: true, height: true } } },
      },
    },
  })

  if (!album || !album.isPublic) notFound()

  const photos = album.media.map((m) => m.media)

  if (album.passwordHash) {
    const cookieStore = await cookies()
    const cookieValue = cookieStore.get(albumAccessCookieName(id))?.value
    const verified = verifyAlbumAccessCookie(id, album.passwordHash, cookieValue)
    if (!verified) {
      return <PublicAlbumGate albumId={id} albumName={album.name} />
    }
  }

  return <PublicPhotoGrid albumName={album.name} photos={photos} />
}
