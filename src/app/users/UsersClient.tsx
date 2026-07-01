"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  App,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
} from "antd"
import {
  DeleteOutlined,
  KeyOutlined,
  UserAddOutlined,
} from "@ant-design/icons"
import type { ColumnsType } from "antd/es/table"

interface UserRow {
  id: string
  username: string
  role: "ADMIN" | "USER"
  createdAt: string
  mediaCount: number
  albumCount: number
}

interface Props {
  currentUserId: string
  initialUsers: UserRow[]
}

export default function UsersClient({ currentUserId, initialUsers }: Props) {
  const router = useRouter()
  const { message } = App.useApp()

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm] = Form.useForm()
  const [creating, setCreating] = useState(false)

  const [resetTarget, setResetTarget] = useState<UserRow | null>(null)
  const [resetForm] = Form.useForm()
  const [resetting, setResetting] = useState(false)

  const [busyId, setBusyId] = useState<string | null>(null)

  async function handleCreate(values: { username: string; password: string; role: "ADMIN" | "USER" }) {
    setCreating(true)
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      if (res.ok) {
        message.success("User created")
        setCreateOpen(false)
        createForm.resetFields()
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        message.error(data.error ?? "Could not create user")
      }
    } finally {
      setCreating(false)
    }
  }

  async function handleReset(values: { password: string }) {
    if (!resetTarget) return
    setResetting(true)
    try {
      const res = await fetch(`/api/users/${resetTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: values.password }),
      })
      if (res.ok) {
        message.success(`Password reset for ${resetTarget.username}`)
        setResetTarget(null)
        resetForm.resetFields()
      } else {
        const data = await res.json().catch(() => ({}))
        message.error(data.error ?? "Could not reset password")
      }
    } finally {
      setResetting(false)
    }
  }

  async function handleRoleChange(user: UserRow, role: "ADMIN" | "USER") {
    setBusyId(user.id)
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })
      if (res.ok) {
        message.success(`${user.username} is now ${role === "ADMIN" ? "an admin" : "a user"}`)
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        message.error(data.error ?? "Could not change role")
      }
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(user: UserRow) {
    setBusyId(user.id)
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" })
      if (res.ok) {
        message.success(`Deleted ${user.username}`)
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        message.error(data.error ?? "Could not delete user")
      }
    } finally {
      setBusyId(null)
    }
  }

  const columns: ColumnsType<UserRow> = [
    {
      title: "Username",
      dataIndex: "username",
      render: (username: string, row) => (
        <Space>
          {username}
          {row.id === currentUserId && <Tag>you</Tag>}
        </Space>
      ),
    },
    {
      title: "Role",
      dataIndex: "role",
      render: (role: "ADMIN" | "USER", row) => (
        <Select
          size="small"
          value={role}
          style={{ width: 100 }}
          loading={busyId === row.id}
          disabled={busyId === row.id}
          onChange={(value) => handleRoleChange(row, value)}
          options={[
            { label: "Admin", value: "ADMIN" },
            { label: "User", value: "USER" },
          ]}
        />
      ),
    },
    { title: "Photos", dataIndex: "mediaCount", align: "right" },
    { title: "Albums", dataIndex: "albumCount", align: "right" },
    {
      title: "Created",
      dataIndex: "createdAt",
      render: (createdAt: string) => new Date(createdAt).toLocaleDateString(),
    },
    {
      title: "",
      key: "actions",
      align: "right",
      render: (_: unknown, row) => (
        <Space>
          <Button
            size="small"
            icon={<KeyOutlined />}
            onClick={() => setResetTarget(row)}
          >
            Reset password
          </Button>
          <Popconfirm
            title="Delete this user?"
            description="This permanently removes the account."
            okText="Delete"
            okButtonProps={{ danger: true }}
            disabled={row.id === currentUserId}
            onConfirm={() => handleDelete(row)}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={row.id === currentUserId}
              loading={busyId === row.id}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<UserAddOutlined />} onClick={() => setCreateOpen(true)}>
          Add user
        </Button>
      </div>

      <Table<UserRow>
        rowKey="id"
        columns={columns}
        dataSource={initialUsers}
        pagination={false}
        size="middle"
      />

      <Modal
        title="Add user"
        open={createOpen}
        onOk={() => createForm.submit()}
        onCancel={() => { setCreateOpen(false); createForm.resetFields() }}
        confirmLoading={creating}
        okText="Create"
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
          requiredMark={false}
          initialValues={{ role: "USER" }}
          style={{ marginTop: 8 }}
        >
          <Form.Item
            label="Username"
            name="username"
            rules={[{ required: true, message: "Enter a username" }]}
          >
            <Input autoComplete="off" />
          </Form.Item>
          <Form.Item
            label="Password"
            name="password"
            rules={[
              { required: true, message: "Enter a password" },
              { min: 8, message: "Must be at least 8 characters" },
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item label="Role" name="role">
            <Select
              options={[
                { label: "User", value: "USER" },
                { label: "Admin", value: "ADMIN" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={resetTarget ? `Reset password for "${resetTarget.username}"` : "Reset password"}
        open={resetTarget !== null}
        onOk={() => resetForm.submit()}
        onCancel={() => { setResetTarget(null); resetForm.resetFields() }}
        confirmLoading={resetting}
        okText="Reset password"
      >
        <Form form={resetForm} layout="vertical" onFinish={handleReset} requiredMark={false} style={{ marginTop: 8 }}>
          <Form.Item
            label="New password"
            name="password"
            rules={[
              { required: true, message: "Enter a new password" },
              { min: 8, message: "Must be at least 8 characters" },
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
