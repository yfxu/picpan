import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "../../lib/auth"
import { prisma } from "../../lib/prisma"
import AppLayout from "../AppLayout"
import UsersClient from "./UsersClient"

export default async function UsersPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (session.user.role !== "ADMIN") redirect("/account")

  const instance = await prisma.instance.findFirst()
  if (!instance) redirect("/setup")

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      username: true,
      role: true,
      createdAt: true,
      _count: { select: { media: true, albums: true } },
    },
  })

  return (
    <AppLayout>
      <h2 style={{ marginTop: 0 }}>Users</h2>
      <UsersClient
        currentUserId={session.user.id}
        initialUsers={users.map((u) => ({
          id: u.id,
          username: u.username,
          role: u.role,
          createdAt: u.createdAt.toISOString(),
          mediaCount: u._count.media,
          albumCount: u._count.albums,
        }))}
      />
    </AppLayout>
  )
}
