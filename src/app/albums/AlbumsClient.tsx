"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button, Modal, Input, Tag, theme } from "antd"
import { FolderOutlined, PlusOutlined } from "@ant-design/icons"

interface Album {
  id: string
  name: string
  count: number
  coverId: string | null
  isPublic: boolean
}

interface Props {
  albums: Album[]
}

export default function AlbumsClient({ albums }: Props) {
  const router = useRouter()
  const { token } = theme.useToken()
  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true)
    try {
      const res = await fetch("/api/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (res.ok) {
        setModalOpen(false)
        setName("")
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Albums</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          New Album
        </Button>
      </div>

      {albums.length === 0 ? (
        <p style={{ color: token.colorTextTertiary, textAlign: "center", marginTop: 48 }}>
          No albums yet.
        </p>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 20,
        }}>
          {albums.map((album) => (
            <Link
              key={album.id}
              href={`/albums/${album.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div className="album-card">
                <div style={{
                  aspectRatio: "1",
                  borderRadius: 12,
                  overflow: "hidden",
                  backgroundColor: token.colorFillTertiary,
                  marginBottom: 10,
                }}>
                  {album.coverId ? (
                    <img
                      src={`/api/media/${album.coverId}/small`}
                      alt={album.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <div style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <FolderOutlined style={{ fontSize: 36, color: token.colorTextQuaternary }} />
                    </div>
                  )}
                </div>
                <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 2 }}>{album.name}</div>
                <div style={{ fontSize: 12, color: token.colorTextTertiary }}>
                  {album.count} {album.count === 1 ? "item" : "items"}
                  {album.isPublic && <Tag color="blue" style={{ marginLeft: 6, fontSize: 10, lineHeight: "16px", padding: "0 4px" }}>Public</Tag>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal
        title="New Album"
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => { setModalOpen(false); setName("") }}
        confirmLoading={loading}
        okText="Create"
        okButtonProps={{ disabled: !name.trim() }}
      >
        <Input
          placeholder="Album name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onPressEnter={handleCreate}
          autoFocus
          style={{ marginTop: 8 }}
        />
      </Modal>
    </>
  )
}
