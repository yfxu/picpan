import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "../../lib/auth"
import { prisma } from "../../lib/prisma"
import { Card, Descriptions } from "antd"
import AppLayout from "../AppLayout"
import PublicCdnSettings from "./PublicCdnSettings"

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const instance = await prisma.instance.findFirst()
  if (!instance) redirect("/setup")

  const isAdmin = session.user.role === "ADMIN"

  return (
    <AppLayout>
      <h2 style={{ marginTop: 0 }}>Server Configuration</h2>
      <Card title="Storage" size="small" style={{ maxWidth: 560 }}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Provider">{instance.s3Provider}</Descriptions.Item>
          <Descriptions.Item label="Bucket">{instance.s3Bucket}</Descriptions.Item>
          <Descriptions.Item label="Endpoint">{instance.s3Endpoint}</Descriptions.Item>
          <Descriptions.Item label="CDN">{instance.cdnBaseUrl}</Descriptions.Item>
          <Descriptions.Item label="Trash retention">{instance.trashRetentionDays} days</Descriptions.Item>
        </Descriptions>
      </Card>
      <PublicCdnSettings
        s3PublicBucket={instance.s3PublicBucket}
        cdnPublicBaseUrl={instance.cdnPublicBaseUrl}
        s3PublicEndpoint={instance.s3PublicEndpoint}
        s3PublicRegion={instance.s3PublicRegion}
        s3PublicProvider={instance.s3PublicProvider}
        s3PublicAccessKey={instance.s3PublicAccessKey}
        s3PublicSecretKeySet={Boolean(instance.s3PublicSecretKey)}
        editable={isAdmin}
      />
    </AppLayout>
  )
}
