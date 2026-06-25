"use client"
import { useState } from "react"
import { Typography } from "antd"
import { RowsPhotoAlbum } from "react-photo-album"
import "react-photo-album/rows.css"
import Lightbox from "yet-another-react-lightbox"
import "yet-another-react-lightbox/styles.css"

interface Props {
  albumName: string
  photos: Array<{ id: string; width: number | null; height: number | null }>
}

export default function PublicPhotoGrid({ albumName, photos }: Props) {
  const [index, setIndex] = useState(-1)

  const albumPhotos = photos.map((p) => ({
    src: `/api/media/${p.id}/medium`,
    width: p.width ?? 4,
    height: p.height ?? 3,
    key: p.id,
  }))

  const slides = photos.map((p) => ({ src: `/api/media/${p.id}/original` }))

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
      <Typography.Title level={2} style={{ marginTop: 0 }}>{albumName}</Typography.Title>
      {photos.length === 0 ? (
        <Typography.Text type="secondary">No photos in this album.</Typography.Text>
      ) : (
        <RowsPhotoAlbum
          photos={albumPhotos}
          targetRowHeight={300}
          rowConstraints={{ minPhotos: 1 }}
          spacing={8}
          onClick={({ index: i }) => setIndex(i)}
        />
      )}
      <Lightbox
        open={index >= 0}
        index={index}
        close={() => setIndex(-1)}
        slides={slides}
        on={{ view: ({ index: i }) => setIndex(i) }}
      />
    </div>
  )
}
