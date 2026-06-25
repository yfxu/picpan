"use client"
import { useState } from "react"
import { Button } from "antd"
import { SettingOutlined } from "@ant-design/icons"
import AlbumSettingsModal from "../../AlbumSettingsModal"

interface Props {
  albumId: string
  albumName: string
  isPublic: boolean
  hasPassword: boolean
}

export default function AlbumDetailClient({ albumId, albumName, isPublic, hasPassword }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 0, marginBottom: 0 }}>
        <h2 style={{ margin: 0 }}>{albumName}</h2>
        <Button
          type="text"
          icon={<SettingOutlined />}
          size="small"
          onClick={() => setOpen(true)}
          style={{ color: "#999" }}
        />
      </div>
      <AlbumSettingsModal
        albumId={albumId}
        albumName={albumName}
        isPublic={isPublic}
        hasPassword={hasPassword}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
