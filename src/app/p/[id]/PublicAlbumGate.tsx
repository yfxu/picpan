"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, Input, Button, Typography, Space, Alert } from "antd"
import { LockOutlined } from "@ant-design/icons"

interface Props {
  albumId: string
  albumName: string
}

export default function PublicAlbumGate({ albumId, albumName }: Props) {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch(`/api/albums/${albumId}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        router.refresh()
      } else {
        setError(true)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#f5f5f5",
    }}>
      <Card style={{ width: 360 }}>
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Space align="center">
            <LockOutlined style={{ fontSize: 20 }} />
            <Typography.Title level={4} style={{ margin: 0 }}>{albumName}</Typography.Title>
          </Space>
          <Typography.Text type="secondary">This album is password protected.</Typography.Text>
          {error && <Alert type="error" message="Incorrect password" showIcon />}
          <Input.Password
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onPressEnter={handleSubmit}
            autoFocus
          />
          <Button type="primary" block loading={loading} onClick={handleSubmit} disabled={!password}>
            View album
          </Button>
        </Space>
      </Card>
    </div>
  )
}
