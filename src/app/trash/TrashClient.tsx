"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { App, Button, Dropdown, Modal, theme, Checkbox } from "antd"
import {
  DeleteOutlined,
  EllipsisOutlined,
  UndoOutlined,
} from "@ant-design/icons"
import { RowsPhotoAlbum } from "react-photo-album"
import "react-photo-album/rows.css"

interface TrashItem {
  id: string
  width: number | null
  height: number | null
  filename: string
  deletedAt: string
}

interface Props {
  items: TrashItem[]
  retentionDays: number
}

function daysAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
}

export default function TrashClient({ items, retentionDays }: Props) {
  const router = useRouter()
  const { token } = theme.useToken()
  const { message } = App.useApp()

  const [emptyModalOpen, setEmptyModalOpen] = useState(false)
  const [forceModalOpen, setForceModalOpen] = useState(false)
  const [forceAcknowledged, setForceAcknowledged] = useState(false)
  const [loading, setLoading] = useState(false)

  const eligibleCount = items.filter((i) => daysAgo(i.deletedAt) >= retentionDays).length
  const totalCount = items.length

  async function handleRestore(id: string) {
    await fetch(`/api/trash/${id}/restore`, { method: "POST" })
    router.refresh()
  }

  async function handleEmpty(force: boolean) {
    setLoading(true)
    try {
      const res = await fetch("/api/trash", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      })
      const data = await res.json()
      message.success(`${data.deleted} photo${data.deleted !== 1 ? "s" : ""} permanently deleted`)
      setEmptyModalOpen(false)
      setForceModalOpen(false)
      setForceAcknowledged(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const albumPhotos = items.map((p) => ({
    src: `/api/media/${p.id}/medium`,
    width: p.width ?? 4,
    height: p.height ?? 3,
    key: p.id,
    id: p.id,
    deletedAt: p.deletedAt,
  }))

  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>Trash</h2>
        <span style={{ fontSize: 13, color: token.colorTextTertiary }}>
          Items are permanently deleted after {retentionDays} days
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <Button
          icon={<DeleteOutlined />}
          disabled={eligibleCount === 0}
          onClick={() => setEmptyModalOpen(true)}
        >
          Empty eligible ({eligibleCount} photo{eligibleCount !== 1 ? "s" : ""})
        </Button>
        {totalCount > 0 && (
          <Button
            danger
            onClick={() => setForceModalOpen(true)}
          >
            Force empty all ({totalCount})
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <p style={{ color: token.colorTextTertiary, textAlign: "center", marginTop: 48 }}>
          Trash is empty.
        </p>
      ) : (
        <RowsPhotoAlbum
          photos={albumPhotos}
          targetRowHeight={300}
          rowConstraints={{ minPhotos: 1 }}
          spacing={8}
          render={{
            photo: (_props, { photo, width, height }) => {
              const age = daysAgo(photo.deletedAt)
              const eligible = age >= retentionDays
              const daysLeft = retentionDays - age

              const menuItems = [
                {
                  key: "restore",
                  label: "Restore",
                  icon: <UndoOutlined />,
                  onClick: () => handleRestore(photo.id),
                },
              ]

              return (
                <div
                  key={photo.key}
                  style={{ position: "relative", width, height, backgroundColor: token.colorFillSecondary }}
                >
                  <img
                    src={photo.src}
                    alt=""
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                      borderRadius: 4,
                      filter: "brightness(0.75)",
                    }}
                  />

                  <div
                    style={{
                      position: "absolute",
                      top: 6,
                      left: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#fff",
                      background: eligible ? "rgba(255,77,79,0.85)" : "rgba(0,0,0,0.55)",
                      borderRadius: 4,
                      padding: "2px 6px",
                      lineHeight: 1.6,
                    }}
                  >
                    {eligible ? "Eligible for deletion" : `${daysLeft}d remaining`}
                  </div>

                  <div
                    style={{
                      position: "absolute",
                      bottom: 4,
                      right: 4,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Dropdown trigger={["click"]} menu={{ items: menuItems }}>
                      <Button
                        type="text"
                        size="small"
                        icon={<EllipsisOutlined />}
                        style={{ color: "#fff" }}
                      />
                    </Dropdown>
                  </div>
                </div>
              )
            },
          }}
        />
      )}

      <Modal
        title="Empty eligible trash"
        open={emptyModalOpen}
        onOk={() => handleEmpty(false)}
        onCancel={() => setEmptyModalOpen(false)}
        okText="Delete permanently"
        okButtonProps={{ danger: true, loading }}
        cancelButtonProps={{ disabled: loading }}
      >
        <p>
          This will permanently delete <strong>{eligibleCount} photo{eligibleCount !== 1 ? "s" : ""}</strong> from
          your S3 bucket. These items have been in trash for more than {retentionDays} days and
          are past your provider&apos;s minimum retention period.
        </p>
        <p style={{ color: token.colorTextSecondary, fontSize: 13 }}>
          {totalCount - eligibleCount > 0
            ? `${totalCount - eligibleCount} photo${totalCount - eligibleCount !== 1 ? "s" : ""} trashed less than ${retentionDays} days ago will not be affected.`
            : null}
        </p>
      </Modal>

      <Modal
        title="Force empty all trash"
        open={forceModalOpen}
        onOk={() => handleEmpty(true)}
        onCancel={() => { setForceModalOpen(false); setForceAcknowledged(false) }}
        okText="Delete all permanently"
        okButtonProps={{ danger: true, loading, disabled: !forceAcknowledged }}
        cancelButtonProps={{ disabled: loading }}
      >
        <p>
          This will immediately delete all <strong>{totalCount} photo{totalCount !== 1 ? "s" : ""}</strong> from
          your S3 bucket, including <strong>{totalCount - eligibleCount}</strong> photo{totalCount - eligibleCount !== 1 ? "s" : ""} that
          haven&apos;t reached the {retentionDays}-day retention period yet.
        </p>
        <p style={{ color: token.colorWarning, fontWeight: 500 }}>
          Your storage provider may charge for objects deleted before their minimum retention period.
        </p>
        <Checkbox
          checked={forceAcknowledged}
          onChange={(e) => setForceAcknowledged(e.target.checked)}
        >
          I understand I am responsible for any charges from my storage provider
        </Checkbox>
      </Modal>
    </>
  )
}
