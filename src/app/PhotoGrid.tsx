"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { App, Button, Dropdown, theme } from "antd"
import {
  CheckOutlined,
  CloudOutlined,
  CloudServerOutlined,
  DeleteOutlined,
  EllipsisOutlined,
  FolderAddOutlined,
  LinkOutlined,
  MinusCircleOutlined,
} from "@ant-design/icons"
import { RowsPhotoAlbum } from "react-photo-album"
import "react-photo-album/rows.css"
import Lightbox from "yet-another-react-lightbox"
import "yet-another-react-lightbox/styles.css"
import { useSelection } from "./SelectionContext"

interface Props {
  photos: Array<{ id: string; width: number | null; height: number | null; cdnPublic: boolean; cdnToken: string | null }>
  albumId?: string
  cdnPublicBaseUrl?: string | null
}

export default function PhotoGrid({ photos, albumId, cdnPublicBaseUrl }: Props) {
  const router = useRouter()
  const { token } = theme.useToken()
  const { message } = App.useApp()
  const { selected, selectMode, toggleSelect, clearSelection, setAlbumTargets, setCurrentAlbumId } = useSelection()
  const [index, setIndex] = useState(-1)

  useEffect(() => {
    setCurrentAlbumId(albumId ?? null)
    return () => setCurrentAlbumId(null)
  }, [albumId, setCurrentAlbumId])

  useEffect(() => {
    if (!selectMode) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") clearSelection() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [selectMode, clearSelection])

  async function handleDelete(id: string) {
    await fetch(`/api/media/${id}`, { method: "DELETE" })
    router.refresh()
  }

  async function handleRemoveFromAlbum(mediaId: string) {
    await fetch(`/api/albums/${albumId}/media`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaIds: [mediaId] }),
    })
    router.refresh()
  }

  async function handleSetCdn(mediaId: string, action: "publish" | "unpublish") {
    const res = await fetch("/api/media/cdn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaIds: [mediaId], action }),
    })
    if (res.ok) {
      message.success(action === "publish" ? "Photo published to CDN" : "Photo removed from CDN")
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      message.error(data.error ?? "Operation failed")
    }
  }

  async function handleCopyCdnLink(cdnToken: string, size: "small" | "medium" | "original") {
    if (!cdnPublicBaseUrl) return
    const base = cdnPublicBaseUrl.replace(/\/+$/, "")
    await navigator.clipboard.writeText(`${base}/${cdnToken}/${size}.jpg`)
    message.success(`${size[0].toUpperCase()}${size.slice(1)} CDN link copied`)
  }

  const photoById = new Map(photos.map((p) => [p.id, p]))

  if (photos.length === 0) {
    return (
      <p style={{ color: "#999", marginTop: 24, textAlign: "center" }}>
        No photos yet. Use the + button above to upload.
      </p>
    )
  }

  const albumPhotos = photos.map((p) => ({
    src: `/api/media/${p.id}/medium`,
    width: p.width ?? 4,
    height: p.height ?? 3,
    key: p.id,
    id: p.id,
  }))

  const slides = photos.map((p) => ({
    src: `/api/media/${p.id}/original`,
  }))

  return (
    <>
      <div style={{ marginTop: 24 }}>
        <RowsPhotoAlbum
          photos={albumPhotos}
          targetRowHeight={300}
          rowConstraints={{ minPhotos: 1 }}
          onClick={({ index: i }) => setIndex(i)}
          spacing={8}
          render={{
            photo: ({ onClick }, { photo, width, height }) => {
              const isSelected = selected.has(photo.id)

              const data = photoById.get(photo.id)
              const isCdnPublic = data?.cdnPublic ?? false

              const menuItems = [
                {
                  key: "add-to-album",
                  label: "Add to Album",
                  icon: <FolderAddOutlined />,
                  onClick: () => setAlbumTargets([photo.id]),
                },
                ...(albumId ? [{
                  key: "remove-from-album",
                  label: "Remove from Album",
                  icon: <MinusCircleOutlined />,
                  onClick: () => handleRemoveFromAlbum(photo.id),
                }] : []),
                isCdnPublic
                  ? {
                      key: "cdn-remove",
                      label: "Remove from CDN",
                      icon: <CloudOutlined />,
                      onClick: () => handleSetCdn(photo.id, "unpublish"),
                    }
                  : {
                      key: "cdn-publish",
                      label: "Make public on CDN",
                      icon: <CloudServerOutlined />,
                      onClick: () => handleSetCdn(photo.id, "publish"),
                    },
                ...(isCdnPublic && data?.cdnToken ? [{
                  key: "cdn-copy",
                  label: "Copy CDN link",
                  icon: <LinkOutlined />,
                  children: [
                    {
                      key: "cdn-copy-original",
                      label: "Original",
                      onClick: () => handleCopyCdnLink(data.cdnToken!, "original"),
                    },
                    {
                      key: "cdn-copy-medium",
                      label: "Medium",
                      onClick: () => handleCopyCdnLink(data.cdnToken!, "medium"),
                    },
                    {
                      key: "cdn-copy-small",
                      label: "Small",
                      onClick: () => handleCopyCdnLink(data.cdnToken!, "small"),
                    },
                  ],
                }] : []),
                {
                  key: "delete",
                  label: "Delete",
                  icon: <DeleteOutlined />,
                  danger: true,
                  onClick: () => handleDelete(photo.id),
                },
              ]

              return (
                <div
                  key={photo.key}
                  className={[
                    "photo-wrapper",
                    selectMode ? "select-mode" : "",
                    isSelected ? "photo-selected" : "",
                  ].filter(Boolean).join(" ")}
                  style={{ position: "relative", width, height, cursor: "pointer", backgroundColor: token.colorFillSecondary }}
                  onClick={selectMode ? () => toggleSelect(photo.id) : onClick}
                >
                  <img
                    src={photo.src}
                    alt=""
                    style={{
                      position: "absolute",
                      inset: isSelected ? 32 : 0,
                      width: isSelected ? "calc(100% - 64px)" : "100%",
                      height: isSelected ? "calc(100% - 64px)" : "100%",
                      objectFit: "cover",
                      display: "block",
                      transition: "inset 150ms ease, width 150ms ease, height 150ms ease",
                      borderRadius: 4,
                    }}
                  />

                  {isSelected && (
                    <div style={{
                      position: "absolute",
                      inset: 0,
                      border: `2px solid ${token.colorPrimary}`,
                      pointerEvents: "none",
                      zIndex: 2,
                    }} />
                  )}

                  {isCdnPublic && !selectMode && (
                    <div
                      title="Public on CDN"
                      style={{
                        position: "absolute",
                        top: 6,
                        right: 6,
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        backgroundColor: "rgba(0,0,0,0.5)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 2,
                        pointerEvents: "none",
                      }}
                    >
                      <CloudOutlined style={{ fontSize: 12 }} />
                    </div>
                  )}

                  <div
                    className="photo-select-circle"
                    style={{
                      position: "absolute",
                      top: 6,
                      left: 6,
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      border: `2px solid ${isSelected ? token.colorPrimary : "rgba(255,255,255,0.9)"}`,
                      backgroundColor: isSelected ? token.colorPrimary : undefined,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: 0,
                      transition: "opacity 150ms",
                      pointerEvents: "auto",
                      zIndex: 3,
                      boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                      cursor: "pointer",
                    }}
                    onClick={(e) => { e.stopPropagation(); toggleSelect(photo.id) }}
                  >
                    <CheckOutlined style={{ fontSize: 11 }} />
                  </div>

                  <div
                    className="photo-overlay"
                    style={{
                      position: "absolute",
                      inset: 0,
                      opacity: 0,
                      transition: "opacity 150ms",
                      background: "linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.55))",
                      display: "flex",
                      alignItems: "flex-end",
                      justifyContent: "flex-end",
                      padding: 4,
                      pointerEvents: "none",
                      borderRadius: 4,
                    }}
                  >
                    <div onClick={(e) => e.stopPropagation()} style={{ pointerEvents: "auto" }}>
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
                </div>
              )
            },
          }}
        />
      </div>

      <Lightbox
        open={index >= 0}
        index={index}
        close={() => setIndex(-1)}
        slides={slides}
        on={{ view: ({ index: i }) => setIndex(i) }}
      />
    </>
  )
}
