import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "../../lib/auth"
import { prisma } from "../../lib/prisma"
import AppLayout from "../AppLayout"
import AlbumsClient from "./AlbumsClient"

export default async function AlbumsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const instance = await prisma.instance.findFirst()
  if (!instance) redirect("/setup")

  const albums = await prisma.album.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { media: true } },
      media: {
        take: 1,
        orderBy: { addedAt: "asc" },
        select: { media: { select: { id: true } } },
      },
    },
  })

  return (
    <AppLayout>
      <AlbumsClient
        albums={albums.map((a) => ({
          id: a.id,
          name: a.name,
          count: a._count.media,
          coverId: a.media[0]?.media.id ?? null,
          isPublic: a.isPublic,
        }))}
      />
    </AppLayout>
  )
}
