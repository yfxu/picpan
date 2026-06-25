export const dynamic = "force-dynamic"

import { prisma } from "../../lib/prisma"
import { redirect } from "next/navigation"
import SetupForm from "./SetupForm"
import { Card } from "antd"

export default async function SetupPage() {
  const instance = await prisma.instance.findFirst()
  if (instance) redirect("/")

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f5", padding: "1.5rem" }}>
      <Card style={{ width: "100%", maxWidth: 520 }}>
        <div style={{ marginBottom: 24 }}>
          <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#8c8c8c" }}>
            First run
          </p>
          <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 600, lineHeight: 1.4 }}>Configure fatu</h2>
          <p style={{ margin: 0, color: "#8c8c8c", fontSize: 13, lineHeight: 1.6 }}>
            Connect your S3-compatible bucket and CDN. You only do this once.
          </p>
        </div>
        <SetupForm />
      </Card>
    </div>
  )
}
