"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, Input, Select, Button, Space, Typography, Alert, App } from "antd"

interface Props {
  s3PublicBucket: string | null
  cdnPublicBaseUrl: string | null
  s3PublicEndpoint: string | null
  s3PublicRegion: string | null
  s3PublicProvider: string | null
  s3PublicAccessKey: string | null
  s3PublicSecretKeySet: boolean
  editable: boolean
}

const PROVIDERS = ["Cloudflare R2", "Backblaze B2", "Wasabi", "Hetzner", "MinIO", "Other"]

export default function PublicCdnSettings({
  s3PublicBucket,
  cdnPublicBaseUrl,
  s3PublicEndpoint,
  s3PublicRegion,
  s3PublicProvider,
  s3PublicAccessKey,
  s3PublicSecretKeySet,
  editable,
}: Props) {
  const router = useRouter()
  const { message } = App.useApp()
  const [bucket, setBucket] = useState(s3PublicBucket ?? "")
  const [url, setUrl] = useState(cdnPublicBaseUrl ?? "")
  const [provider, setProvider] = useState(s3PublicProvider ?? "Cloudflare R2")
  const [endpoint, setEndpoint] = useState(s3PublicEndpoint ?? "")
  const [region, setRegion] = useState(s3PublicRegion ?? "")
  const [accessKey, setAccessKey] = useState(s3PublicAccessKey ?? "")
  // Secret key is write-only: never sent to the client. Empty means "leave
  // unchanged"; the admin types a value only to set or rotate it.
  const [secretKey, setSecretKey] = useState("")
  const [saving, setSaving] = useState(false)

  const dirty =
    bucket !== (s3PublicBucket ?? "") ||
    url !== (cdnPublicBaseUrl ?? "") ||
    provider !== (s3PublicProvider ?? "Cloudflare R2") ||
    endpoint !== (s3PublicEndpoint ?? "") ||
    region !== (s3PublicRegion ?? "") ||
    accessKey !== (s3PublicAccessKey ?? "") ||
    secretKey !== ""

  async function handleSave() {
    setSaving(true)
    try {
      const payload: Record<string, string> = {
        s3PublicBucket: bucket,
        cdnPublicBaseUrl: url,
        s3PublicProvider: provider,
        s3PublicEndpoint: endpoint,
        s3PublicRegion: region,
        s3PublicAccessKey: accessKey,
      }
      // Only send the secret when the admin actually typed one, so saving other
      // fields doesn't wipe a previously-stored secret.
      if (secretKey) payload.s3PublicSecretKey = secretKey

      const res = await fetch("/api/instance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        message.success("Public CDN settings saved")
        setSecretKey("")
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        message.error(data.error ?? "Failed to save")
      }
    } finally {
      setSaving(false)
    }
  }

  const configured = Boolean(
    s3PublicBucket && cdnPublicBaseUrl && s3PublicEndpoint && s3PublicRegion && s3PublicAccessKey && s3PublicSecretKeySet
  )

  return (
    <Card title="Public CDN" size="small" style={{ maxWidth: 560, marginTop: 16 }}>
      <Space orientation="vertical" style={{ width: "100%" }} size="middle">
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          Photos you mark as CDN-served are copied as plaintext JPEGs into a separate
          public bucket, which has its own provider and credentials — independent of
          your private storage. Leave blank to disable.
        </Typography.Text>

        {!configured && (
          <Alert
            type="info"
            showIcon
            message="CDN serving is disabled"
            description="Fill in the public bucket, its provider credentials, and the CDN URL below to enable marking photos as public."
          />
        )}

        <div>
          <Typography.Text strong style={{ fontSize: 13 }}>Public provider</Typography.Text>
          <Select
            value={provider}
            onChange={setProvider}
            options={PROVIDERS.map((p) => ({ value: p, label: p }))}
            disabled={!editable}
            style={{ marginTop: 4, width: "100%" }}
          />
        </div>

        <div>
          <Typography.Text strong style={{ fontSize: 13 }}>Public bucket name</Typography.Text>
          <Input
            placeholder="e.g. my-photos-public"
            value={bucket}
            onChange={(e) => setBucket(e.target.value)}
            disabled={!editable}
            style={{ marginTop: 4 }}
          />
        </div>

        <div>
          <Typography.Text strong style={{ fontSize: 13 }}>Public bucket endpoint</Typography.Text>
          <Input
            placeholder="https://<account>.r2.cloudflarestorage.com"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            disabled={!editable}
            style={{ marginTop: 4 }}
          />
        </div>

        <div>
          <Typography.Text strong style={{ fontSize: 13 }}>Public bucket region</Typography.Text>
          <Input
            placeholder="e.g. auto (R2), us-east-1"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            disabled={!editable}
            style={{ marginTop: 4 }}
          />
        </div>

        <div>
          <Typography.Text strong style={{ fontSize: 13 }}>Public access key</Typography.Text>
          <Input
            placeholder="Access key ID scoped to the public bucket"
            value={accessKey}
            onChange={(e) => setAccessKey(e.target.value)}
            disabled={!editable}
            style={{ marginTop: 4 }}
          />
        </div>

        <div>
          <Typography.Text strong style={{ fontSize: 13 }}>Public secret key</Typography.Text>
          <Input.Password
            placeholder={s3PublicSecretKeySet ? "•••••••• (unchanged — type to replace)" : "Secret access key"}
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            disabled={!editable}
            autoComplete="new-password"
            style={{ marginTop: 4 }}
          />
        </div>

        <div>
          <Typography.Text strong style={{ fontSize: 13 }}>Public CDN base URL</Typography.Text>
          <Input
            placeholder="https://cdn-public.yourdomain.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={!editable}
            style={{ marginTop: 4 }}
          />
        </div>

        <Alert
          type="warning"
          showIcon
          message="Operator setup required"
          description={
            <div style={{ fontSize: 12 }}>
              <p style={{ marginTop: 0 }}>The public bucket must be reachable at the CDN URL above:</p>
              <ol style={{ paddingLeft: 18, marginBottom: 0 }}>
                <li>Create the bucket on the public provider and enable public read access on it.</li>
                <li>Put your CDN/proxy (e.g. Cloudflare) in front of the public bucket origin{endpoint ? <> <code>{endpoint}</code></> : null}.</li>
                <li>Point a DNS record for your CDN hostname at the CDN, and set that hostname here.</li>
                <li>Use credentials scoped to only this public bucket — they should never grant access to your private storage.</li>
              </ol>
            </div>
          }
        />

        {editable && (
          <Button type="primary" onClick={handleSave} loading={saving} disabled={!dirty}>
            Save
          </Button>
        )}
      </Space>
    </Card>
  )
}
