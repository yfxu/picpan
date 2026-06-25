"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Modal, Switch, Input, Button, Space, Typography, Popconfirm, Divider, message } from "antd"
import { LinkOutlined, DeleteOutlined } from "@ant-design/icons"

interface Props {
  albumId: string
  albumName: string
  isPublic: boolean
  hasPassword: boolean
  open: boolean
  onClose: () => void
}

export default function AlbumSettingsModal({ albumId, albumName, isPublic, hasPassword, open, onClose }: Props) {
  const router = useRouter()
  const [pub, setPub] = useState(isPublic)
  const [password, setPassword] = useState("")
  const [clearPassword, setClearPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      await fetch(`/api/albums/${albumId}`, { method: "DELETE" })
      router.push("/albums")
    } finally {
      setDeleting(false)
    }
  }

  function handleClose() {
    setPub(isPublic)
    setPassword("")
    setClearPassword(false)
    onClose()
  }

  async function handleSave() {
    setSaving(true)
    try {
      const body: Record<string, unknown> = { isPublic: pub }
      if (clearPassword) {
        body.password = null
      } else if (password) {
        body.password = password
      }
      await fetch(`/api/albums/${albumId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      router.refresh()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/p/${albumId}`)
    message.success("Link copied")
  }

  const currentlyHasPassword = hasPassword && !clearPassword

  return (
    <Modal
      title={`"${albumName}" Settings`}
      open={open}
      onOk={handleSave}
      onCancel={handleClose}
      confirmLoading={saving}
      okText="Save"
    >
      <Space direction="vertical" style={{ width: "100%", marginTop: 8 }} size="large">
        <Space>
          <Switch checked={pub} onChange={setPub} />
          <span>Make this album public</span>
        </Space>

        {pub && (
          <Space direction="vertical" style={{ width: "100%" }}>
            {currentlyHasPassword && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                A password is set. Enter a new one to change it, or clear it below.
              </Typography.Text>
            )}
            <Input.Password
              placeholder={currentlyHasPassword ? "New password (leave blank to keep current)" : "Password (optional)"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setClearPassword(false) }}
            />
            {currentlyHasPassword && (
              <Button
                type="link"
                danger
                size="small"
                style={{ padding: 0 }}
                onClick={() => { setClearPassword(true); setPassword("") }}
              >
                Clear password
              </Button>
            )}
            {clearPassword && (
              <Typography.Text type="danger" style={{ fontSize: 12 }}>
                Password will be removed on save.
              </Typography.Text>
            )}
            <Button icon={<LinkOutlined />} onClick={copyLink} style={{ width: "100%" }}>
              Copy public link
            </Button>
          </Space>
        )}
        <Divider style={{ margin: 0 }} />

        <Popconfirm
          title="Delete this album?"
          description="The album will be removed. Photos inside will not be deleted."
          okText="Delete"
          okButtonProps={{ danger: true }}
          onConfirm={handleDelete}
        >
          <Button danger icon={<DeleteOutlined />} loading={deleting} block>
            Delete album
          </Button>
        </Popconfirm>
      </Space>
    </Modal>
  )
}
