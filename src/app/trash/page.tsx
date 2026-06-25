import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "../../lib/auth"
import { prisma } from "../../lib/prisma"
import AppLayout from "../AppLayout"
import TrashClient from "./TrashClient"

export default async function TrashPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const instance = await prisma.instance.findFirst()
  if (!instance) redirect("/setup")

  const items = await prisma.media.findMany({
    where: { userId: session.user.id, deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    select: { id: true, width: true, height: true, filename: true, deletedAt: true },
  })

  return (
    <AppLayout>
      <TrashClient
        items={items.map((i) => ({ ...i, deletedAt: i.deletedAt!.toISOString() }))}
        retentionDays={instance.trashRetentionDays}
      />
    </AppLayout>
  )
}
