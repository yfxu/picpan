"use client"
import { useState } from "react"
import { Form, Input, Button, Alert } from "antd"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const router = useRouter()

  async function onFinish(values: { username: string; password: string }) {
    setIsPending(true)
    setError(null)

    const result = await signIn("credentials", {
      username: values.username,
      password: values.password,
      redirect: false,
    })

    setIsPending(false)

    if (result?.error) {
      setError("Invalid username or password")
    } else {
      router.push("/")
      router.refresh()
    }
  }

  return (
    <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
      {error && (
        <Form.Item>
          <Alert message={error} type="error" showIcon />
        </Form.Item>
      )}
      <Form.Item label="Username" name="username" rules={[{ required: true, message: "Required" }]}>
        <Input size="large" autoComplete="username" />
      </Form.Item>
      <Form.Item label="Password" name="password" rules={[{ required: true, message: "Required" }]}>
        <Input.Password size="large" autoComplete="current-password" />
      </Form.Item>
      <Form.Item style={{ marginBottom: 0 }}>
        <Button type="primary" htmlType="submit" block size="large" loading={isPending}>
          Sign in
        </Button>
      </Form.Item>
    </Form>
  )
}
