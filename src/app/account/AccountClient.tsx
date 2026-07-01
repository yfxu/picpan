"use client"
import { useState } from "react"
import { App, Button, Card, Descriptions, Form, Input, Tag } from "antd"

interface Props {
  username: string
  role: "ADMIN" | "USER"
}

export default function AccountClient({ username, role }: Props) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  async function onFinish(values: { currentPassword: string; newPassword: string }) {
    setSaving(true)
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      })
      if (res.ok) {
        message.success("Password changed")
        form.resetFields()
      } else {
        const data = await res.json().catch(() => ({}))
        message.error(data.error ?? "Could not change password")
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 480, display: "flex", flexDirection: "column", gap: 24 }}>
      <Card size="small">
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Username">{username}</Descriptions.Item>
          <Descriptions.Item label="Role">
            <Tag color={role === "ADMIN" ? "blue" : "default"}>{role}</Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Change password" size="small">
        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            label="Current password"
            name="currentPassword"
            rules={[{ required: true, message: "Enter your current password" }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item
            label="New password"
            name="newPassword"
            rules={[
              { required: true, message: "Enter a new password" },
              { min: 8, message: "Must be at least 8 characters" },
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            label="Confirm new password"
            name="confirmPassword"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "Confirm your new password" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) return Promise.resolve()
                  return Promise.reject(new Error("Passwords do not match"))
                },
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={saving}>
              Change password
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
