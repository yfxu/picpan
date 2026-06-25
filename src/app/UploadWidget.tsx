"use client"
import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button, Card, List } from "antd"
import { UploadOutlined, CheckCircleFilled, CloseCircleFilled, LoadingOutlined } from "@ant-design/icons"

interface FileStatus {
  name: string
  status: "uploading" | "done" | "error"
  error?: string
}

export default function UploadWidget() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<FileStatus[]>([])
  const [busy, setBusy] = useState(false)

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    if (selected.length === 0) return
    if (inputRef.current) inputRef.current.value = ""

    setBusy(true)
    setFiles(selected.map((f) => ({ name: f.name, status: "uploading" })))

    await Promise.all(
      selected.map(async (file, i) => {
        try {
          const formData = new FormData()
          formData.append("file", file)
          const res = await fetch("/api/media/upload", { method: "POST", body: formData })
          const json = await res.json()
          setFiles((prev) =>
            prev.map((f, j) =>
              j === i
                ? res.ok
                  ? { ...f, status: "done" }
                  : { ...f, status: "error", error: json.error ?? "Upload failed" }
                : f
            )
          )
        } catch {
          setFiles((prev) =>
            prev.map((f, j) => (j === i ? { ...f, status: "error", error: "Network error" } : f))
          )
        }
      })
    )

    router.refresh()
    setBusy(false)
  }

  const doneCount = files.filter((f) => f.status === "done").length
  const errorCount = files.filter((f) => f.status === "error").length
  const allSettled = files.length > 0 && files.every((f) => f.status !== "uploading")

  return (
    <Card title="Upload" size="small" style={{ maxWidth: 560, marginTop: 16 }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={handleChange}
      />
      <Button
        icon={<UploadOutlined />}
        loading={busy}
        onClick={() => inputRef.current?.click()}
      >
        Choose photos
      </Button>

      {files.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {allSettled && (
            <p style={{ margin: "0 0 8px", fontSize: 13, color: errorCount > 0 ? "#cf1322" : "#389e0d" }}>
              {doneCount} uploaded{errorCount > 0 ? `, ${errorCount} failed` : ""}
            </p>
          )}
          <List
            size="small"
            dataSource={files}
            renderItem={(f) => (
              <List.Item
                style={{ padding: "4px 0" }}
                extra={
                  f.status === "uploading" ? (
                    <LoadingOutlined style={{ color: "#1677ff" }} />
                  ) : f.status === "done" ? (
                    <CheckCircleFilled style={{ color: "#52c41a" }} />
                  ) : (
                    <CloseCircleFilled style={{ color: "#ff4d4f" }} title={f.error} />
                  )
                }
              >
                <span style={{ fontSize: 13, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 380 }}>
                  {f.name}
                </span>
              </List.Item>
            )}
          />
        </div>
      )}
    </Card>
  )
}
