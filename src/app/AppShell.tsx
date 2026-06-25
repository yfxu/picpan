"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ProLayout } from "@ant-design/pro-components"
import { App, Button, Dropdown, Input, Modal, Progress, theme } from "antd"
import {
  AppstoreOutlined,
  CheckCircleFilled,
  CloseOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  FolderAddOutlined,
  HddOutlined,
  MinusCircleOutlined,
  LoadingOutlined,
  LogoutOutlined,
  MoonOutlined,
  PictureOutlined,
  PlusOutlined,
  SettingOutlined,
  SunOutlined,
  UploadOutlined,
} from "@ant-design/icons"
import { signOut } from "next-auth/react"
import { useThemeMode } from "./providers"
import { useSelection } from "./SelectionContext"
import AddToAlbumModal from "./AddToAlbumModal"

interface Props {
  username: string
  storageBytes: number
  children: React.ReactNode
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}

const route = {
  path: "/",
  routes: [
    { path: "/", name: "Photos", icon: <PictureOutlined /> },
    { path: "/albums", name: "Albums", icon: <AppstoreOutlined /> },
    { path: "/trash", name: "Trash", icon: <DeleteOutlined /> },
    { path: "/settings", name: "Server Configuration", icon: <SettingOutlined /> },
  ],
}

export default function AppShell({ username, storageBytes, children }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const { token } = theme.useToken()
  const { notification, message } = App.useApp()
  const { mode, toggle } = useThemeMode()
  const { selected, selectMode, clearSelection, albumTargets, setAlbumTargets, deleteSelected, currentAlbumId, removeFromAlbum } = useSelection()

  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return

    const total = files.length
    let done = 0

    const progressDesc = (n: number) => (
      <div>
        <div style={{ marginBottom: 6, fontVariantNumeric: "tabular-nums" }}>{n} / {total}</div>
        <Progress percent={Math.round((n / total) * 100)} size="small" showInfo={false} />
      </div>
    )

    notification.open({
      key: "upload",
      message: "Uploading photos",
      description: progressDesc(0),
      duration: 0,
      icon: <LoadingOutlined style={{ color: token.colorPrimary }} />,
    })

    await Promise.all(
      files.map(async (file) => {
        try {
          const formData = new FormData()
          formData.append("file", file)
          formData.append("lastModified", String(file.lastModified))
          await fetch("/api/media/upload", { method: "POST", body: formData })
        } finally {
          done++
          const finished = done === total
          notification.open({
            key: "upload",
            message: finished ? "Upload complete" : "Uploading photos",
            description: finished
              ? `${total} photo${total > 1 ? "s" : ""} uploaded successfully`
              : progressDesc(done),
            duration: finished ? 4 : 0,
            icon: finished
              ? <CheckCircleFilled style={{ color: "#52c41a" }} />
              : <LoadingOutlined style={{ color: token.colorPrimary }} />,
          })
        }
      })
    )

    router.refresh()
  }, [notification, token.colorPrimary, router])

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (fileInputRef.current) fileInputRef.current.value = ""
    uploadFiles(files)
  }

  const [dragActive, setDragActive] = useState(false)
  const dragCounter = useRef(0)

  useEffect(() => {
    function onDragEnter(e: DragEvent) {
      if (!e.dataTransfer?.types.includes("Files")) return
      dragCounter.current++
      setDragActive(true)
    }
    function onDragOver(e: DragEvent) {
      if (!e.dataTransfer?.types.includes("Files")) return
      e.preventDefault()
    }
    function onDragLeave() {
      dragCounter.current--
      if (dragCounter.current === 0) setDragActive(false)
    }
    function onDrop(e: DragEvent) {
      e.preventDefault()
      dragCounter.current = 0
      setDragActive(false)
      const files = Array.from(e.dataTransfer?.files ?? []).filter((f) =>
        f.type.startsWith("image/")
      )
      uploadFiles(files)
    }

    window.addEventListener("dragenter", onDragEnter)
    window.addEventListener("dragover", onDragOver)
    window.addEventListener("dragleave", onDragLeave)
    window.addEventListener("drop", onDrop)
    return () => {
      window.removeEventListener("dragenter", onDragEnter)
      window.removeEventListener("dragover", onDragOver)
      window.removeEventListener("dragleave", onDragLeave)
      window.removeEventListener("drop", onDrop)
    }
  }, [uploadFiles])

  const [deleting, setDeleting] = useState(false)

  async function handleDeleteSelected() {
    setDeleting(true)
    try {
      await deleteSelected()
    } finally {
      setDeleting(false)
    }
  }

  const [albumModalOpen, setAlbumModalOpen] = useState(false)
  const [albumName, setAlbumName] = useState("")
  const [albumLoading, setAlbumLoading] = useState(false)

  async function handleCreateAlbum() {
    if (!albumName.trim()) return
    setAlbumLoading(true)
    try {
      const res = await fetch("/api/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: albumName.trim() }),
      })
      if (res.ok) {
        setAlbumModalOpen(false)
        setAlbumName("")
        message.success("Album created")
        router.refresh()
      }
    } finally {
      setAlbumLoading(false)
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={handleFiles}
      />

      <ProLayout
        title="picpan"
        logo={false}
        layout="mix"
        navTheme={mode === "dark" ? "realDark" : "light"}
        fixedHeader
        fixedSider
        collapsedButtonRender={false}
        route={route}
        location={{ pathname }}
        menuItemRender={(item, dom) => (
          <Link href={item.path ?? "/"} style={{ color: "inherit", display: "block" }}>
            {dom}
          </Link>
        )}
        headerTitleRender={(logo, title) =>
          selectMode ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={clearSelection}
                style={{ color: token.colorTextSecondary }}
              />
              <span style={{ fontSize: 14, color: token.colorText, padding: "0 4px" }}>
                {selected.size} selected
              </span>
              <Button
                icon={<FolderAddOutlined />}
                onClick={() => setAlbumTargets([...selected])}
              >
                Add to Album
              </Button>
              {currentAlbumId && (
                <Button icon={<MinusCircleOutlined />} onClick={removeFromAlbum}>
                  Remove from Album
                </Button>
              )}
              <Button danger icon={<DeleteOutlined />} onClick={handleDeleteSelected} loading={deleting} disabled={deleting}>
                Delete
              </Button>
            </div>
          ) : <>{logo}{title}</>
        }
        actionsRender={() => [
          <Button
            key="theme"
            type="text"
            shape="circle"
            icon={mode === "dark" ? <SunOutlined /> : <MoonOutlined />}
            onClick={toggle}
            style={{ color: token.colorTextSecondary }}
          />,
          <Dropdown
            key="add"
            trigger={["click"]}
            menu={{
              items: [
                {
                  key: "upload",
                  icon: <UploadOutlined />,
                  label: "Upload photos",
                  onClick: () => fileInputRef.current?.click(),
                },
                {
                  key: "album",
                  icon: <AppstoreOutlined />,
                  label: "Create album",
                  onClick: () => setAlbumModalOpen(true),
                },
              ],
            }}
          >
            <Button
              type="text"
              shape="circle"
              icon={<PlusOutlined />}
              style={{ color: token.colorTextSecondary }}
            />
          </Dropdown>,
        ]}
        menuFooterRender={() => (
          <div style={{
            padding: "12px 16px",
            fontSize: 12,
            color: token.colorTextTertiary,
            display: "flex",
            alignItems: "center",
            gap: 6,
            borderTop: `1px solid ${token.colorBorderSecondary}`,
          }}>
            <HddOutlined />
            <span>~{formatBytes(storageBytes)} uploaded</span>
          </div>
        )}
        avatarProps={{
          render: (_props, _dom) => (
            <Dropdown
              menu={{
                items: [
                  {
                    key: "logout",
                    icon: <LogoutOutlined />,
                    label: "Sign out",
                    onClick: () => signOut({ callbackUrl: "/login" }),
                  },
                ],
              }}
            >
              <div style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                backgroundColor: token.colorPrimary,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 600,
                fontSize: 13,
                lineHeight: 1,
                cursor: "pointer",
                userSelect: "none",
              }}>
                {username[0].toUpperCase()}
              </div>
            </Dropdown>
          ),
        }}
      >
        {children}
      </ProLayout>

      {dragActive && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}>
          <div style={{
            border: `3px dashed ${token.colorPrimary}`,
            borderRadius: 16,
            padding: "48px 80px",
            color: "#fff",
            textAlign: "center",
            background: "rgba(0,0,0,0.25)",
          }}>
            <CloudUploadOutlined style={{ fontSize: 52, display: "block", marginBottom: 12 }} />
            <span style={{ fontSize: 18, fontWeight: 600 }}>Drop photos to upload</span>
          </div>
        </div>
      )}

      <AddToAlbumModal mediaIds={albumTargets} onClose={() => setAlbumTargets([])} />

      <Modal
        title="New Album"
        open={albumModalOpen}
        onOk={handleCreateAlbum}
        onCancel={() => { setAlbumModalOpen(false); setAlbumName("") }}
        confirmLoading={albumLoading}
        okText="Create"
        okButtonProps={{ disabled: !albumName.trim() }}
      >
        <Input
          placeholder="Album name"
          value={albumName}
          onChange={(e) => setAlbumName(e.target.value)}
          onPressEnter={handleCreateAlbum}
          autoFocus
          style={{ marginTop: 8 }}
        />
      </Modal>
    </>
  )
}
