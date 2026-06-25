import { getServerSession } from "next-auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { authOptions } from "../../../lib/auth"
import { prisma } from "../../../lib/prisma"
import AppLayout from "../../AppLayout"
import PhotoGrid from "../../PhotoGrid"
import AlbumDetailClient from "./AlbumDetailClient"

export default async function AlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const instance = await prisma.instance.findFirst()
  if (!instance) redirect("/setup")

  const album = await prisma.album.findUnique({
    where: { id, userId: session.user.id },
    include: {
      media: {
        where: { media: { deletedAt: null } },
        orderBy: { media: { takenAt: { sort: "desc", nulls: "last" } } },
        select: {
          media: { select: { id: true, width: true, height: true } },
        },
      },
    },
  })

  if (!album) notFound()

  const photos = album.media.map((m) => m.media)

  return (
    <AppLayout>
      <div style={{ marginBottom: 16 }}>
        <Link href="/albums" style={{ fontSize: 13, color: "#999" }}>
          ← Albums
        </Link>
      </div>
      <AlbumDetailClient
        albumId={id}
        albumName={album.name}
        isPublic={album.isPublic}
        hasPassword={album.passwordHash !== null}
      />
      <PhotoGrid photos={photos} albumId={id} />
    </AppLayout>
  )
}
