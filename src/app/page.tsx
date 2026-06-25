import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "../lib/auth"
import { prisma } from "../lib/prisma"
import AppLayout from "./AppLayout"
import PhotoGrid from "./PhotoGrid"

export default async function PhotosPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const instance = await prisma.instance.findFirst()
  if (!instance) redirect("/setup")

  const photos = await prisma.media.findMany({
    where: { userId: session.user.id, deletedAt: null },
    orderBy: [{ takenAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    select: { id: true, width: true, height: true },
  })

  return (
    <AppLayout>
      <PhotoGrid photos={photos} />
    </AppLayout>
  )
}
