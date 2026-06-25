export const dynamic = "force-dynamic"

import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "../../lib/auth"
import { prisma } from "../../lib/prisma"
import LoginForm from "./LoginForm"
import { Card } from "antd"

export default async function LoginPage() {
  const session = await getServerSession(authOptions)
  if (session) redirect("/")

  const instance = await prisma.instance.findFirst()
  if (!instance) redirect("/setup")

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f5", padding: "1.5rem" }}>
      <Card style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ marginBottom: 24 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#8c8c8c" }}>
            fatu
          </span>
          <h4 style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 600 }}>Sign in</h4>
        </div>
        <LoginForm />
      </Card>
    </div>
  )
}
