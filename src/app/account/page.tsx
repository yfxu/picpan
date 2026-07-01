import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "../../lib/auth"
import { prisma } from "../../lib/prisma"
import AppLayout from "../AppLayout"
import AccountClient from "./AccountClient"

export default async function AccountPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const instance = await prisma.instance.findFirst()
  if (!instance) redirect("/setup")

  return (
    <AppLayout>
      <h2 style={{ marginTop: 0 }}>Account</h2>
      <AccountClient username={session.user.name ?? "User"} role={session.user.role} />
    </AppLayout>
  )
}
