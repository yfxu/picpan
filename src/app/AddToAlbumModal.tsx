"use client"
import { useState, useEffect } from "react"
import { Modal, Checkbox, Spin } from "antd"

interface Album {
  id: string
  name: string
}

interface Props {
  mediaIds: string[]
  onClose: () => void
}

export default function AddToAlbumModal({ mediaIds, onClose }: Props) {
  const [albums, setAlbums] = useState<Album[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (mediaIds.length === 0) return
    setSelected([])
    setLoading(true)
    fetch("/api/albums")
      .then((r) => r.json())
      .then((data) => setAlbums(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [mediaIds.length > 0])

  async function handleOk() {
    if (selected.length === 0) { onClose(); return }
    setSubmitting(true)
    try {
      await Promise.all(
        mediaIds.map((id) =>
          fetch(`/api/media/${id}/albums`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ albumIds: selected }),
          })
        )
      )
    } finally {
      setSubmitting(false)
      onClose()
    }
  }

  return (
    <Modal
      title="Add to Album"
      open={mediaIds.length > 0}
      onOk={handleOk}
      onCancel={onClose}
      confirmLoading={submitting}
      okText="Add"
      okButtonProps={{ disabled: selected.length === 0 }}
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: 24 }}><Spin /></div>
      ) : albums.length === 0 ? (
        <p style={{ color: "#999" }}>No albums yet. Create one in the Albums page first.</p>
      ) : (
        <Checkbox.Group
          value={selected}
          onChange={(vals) => setSelected(vals as string[])}
          style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}
        >
          {albums.map((a) => (
            <Checkbox key={a.id} value={a.id}>{a.name}</Checkbox>
          ))}
        </Checkbox.Group>
      )}
    </Modal>
  )
}
