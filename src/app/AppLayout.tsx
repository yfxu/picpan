import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "../lib/auth"
import { prisma } from "../lib/prisma"
import AppShell from "./AppShell"
import { SelectionProvider } from "./SelectionContext"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const instance = await prisma.instance.findFirst()
  if (!instance) redirect("/setup")

  const agg = await prisma.media.aggregate({ _sum: { size: true } })
  const storageBytes = agg._sum.size ?? 0

  return (
    <SelectionProvider>
      <AppShell username={session.user.name ?? "User"} storageBytes={storageBytes}>
        {children}
      </AppShell>
    </SelectionProvider>
  )
}
