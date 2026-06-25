"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Form, Input, Button, Select, Alert, Typography } from "antd"

const { Text } = Typography

const PROVIDERS = ["Backblaze B2", "Wasabi", "Cloudflare R2", "Hetzner", "MinIO", "Other"]

export default function SetupForm() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const router = useRouter()

  async function onFinish(values: Record<string, string>) {
    setIsPending(true)
    setError(null)

    const res = await fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })

    setIsPending(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? "Something went wrong")
    } else {
      router.push("/login")
    }
  }

  return (
    <Form layout="vertical" onFinish={onFinish} requiredMark={false} initialValues={{ s3Provider: "Backblaze B2" }}>
      {error && (
        <Form.Item>
          <Alert message={error} type="error" showIcon />
        </Form.Item>
      )}
      <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginBottom: 12 }}>
        S3 storage
      </Text>
      <Form.Item label="Provider" name="s3Provider" rules={[{ required: true }]}>
        <Select size="large" options={PROVIDERS.map((p) => ({ label: p, value: p }))} />
      </Form.Item>
      <Form.Item label="Endpoint URL" name="s3Endpoint" rules={[{ required: true, type: "url", message: "Enter a valid URL" }]}>
        <Input size="large" placeholder="https://s3.us-east-1.amazonaws.com" />
      </Form.Item>
      <Form.Item label="Region" name="s3Region" rules={[{ required: true, message: "Required" }]}>
        <Input size="large" placeholder="us-east-1" />
      </Form.Item>
      <Form.Item label="Bucket" name="s3Bucket" rules={[{ required: true, message: "Required" }]}>
        <Input size="large" placeholder="my-photos" />
      </Form.Item>
      <Form.Item label="Access key" name="s3AccessKey" rules={[{ required: true, message: "Required" }]}>
        <Input size="large" autoComplete="off" />
      </Form.Item>
      <Form.Item label="Secret key" name="s3SecretKey" rules={[{ required: true, message: "Required" }]}>
        <Input.Password size="large" autoComplete="off" />
      </Form.Item>
      <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginBottom: 12, marginTop: 4 }}>
        CDN
      </Text>
      <Form.Item label="Base URL" name="cdnBaseUrl" rules={[{ required: true, type: "url", message: "Enter a valid URL" }]}>
        <Input size="large" placeholder="https://cdn.example.com" />
      </Form.Item>
      <Form.Item style={{ marginBottom: 0 }}>
        <Button type="primary" htmlType="submit" block size="large" loading={isPending}>
          Save configuration
        </Button>
      </Form.Item>
    </Form>
  )
}
