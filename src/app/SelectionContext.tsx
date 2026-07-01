"use client"
import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"

interface SelectionContextValue {
  selected: Set<string>
  selectMode: boolean
  toggleSelect: (id: string) => void
  clearSelection: () => void
  albumTargets: string[]
  setAlbumTargets: (ids: string[]) => void
  deleteSelected: () => Promise<void>
  currentAlbumId: string | null
  setCurrentAlbumId: (id: string | null) => void
  removeFromAlbum: () => Promise<void>
  setCdnForSelected: (action: "publish" | "unpublish") => Promise<{ ok: boolean; error?: string }>
}

const SelectionContext = createContext<SelectionContextValue>({
  selected: new Set(),
  selectMode: false,
  toggleSelect: () => {},
  clearSelection: () => {},
  albumTargets: [],
  setAlbumTargets: () => {},
  deleteSelected: async () => {},
  currentAlbumId: null,
  setCurrentAlbumId: () => {},
  removeFromAlbum: async () => {},
  setCdnForSelected: async () => ({ ok: false }),
})

export function useSelection() {
  return useContext(SelectionContext)
}

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [albumTargets, setAlbumTargets] = useState<string[]>([])
  const [currentAlbumId, setCurrentAlbumId] = useState<string | null>(null)

  useEffect(() => {
    setSelected(new Set())
    setAlbumTargets([])
    setCurrentAlbumId(null)
  }, [pathname])

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelected(new Set())
  }, [])

  const deleteSelected = useCallback(async () => {
    await Promise.all([...selected].map((id) => fetch(`/api/media/${id}`, { method: "DELETE" })))
    setSelected(new Set())
    router.refresh()
  }, [selected, router])

  const removeFromAlbum = useCallback(async () => {
    if (!currentAlbumId) return
    await fetch(`/api/albums/${currentAlbumId}/media`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaIds: [...selected] }),
    })
    setSelected(new Set())
    router.refresh()
  }, [currentAlbumId, selected, router])

  // Idempotent on the server: already-public photos are skipped on publish, and
  // non-public photos are skipped on unpublish.
  const setCdnForSelected = useCallback(async (action: "publish" | "unpublish") => {
    const res = await fetch("/api/media/cdn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaIds: [...selected], action }),
    })
    if (res.ok) {
      setSelected(new Set())
      router.refresh()
      return { ok: true }
    }
    const data = await res.json().catch(() => ({}))
    return { ok: false, error: data.error as string | undefined }
  }, [selected, router])

  return (
    <SelectionContext.Provider value={{
      selected,
      selectMode: selected.size > 0,
      toggleSelect,
      clearSelection,
      albumTargets,
      setAlbumTargets,
      deleteSelected,
      currentAlbumId,
      setCurrentAlbumId,
      removeFromAlbum,
      setCdnForSelected,
    }}>
      {children}
    </SelectionContext.Provider>
  )
}
