import { createHmac } from "crypto"

export function albumAccessCookieName(albumId: string) {
  return `album_access_${albumId}`
}

export function computeAlbumAccessToken(albumId: string, passwordHash: string): string {
  return createHmac("sha256", process.env.NEXTAUTH_SECRET ?? "")
    .update(`${albumId}:${passwordHash}`)
    .digest("hex")
}

export function verifyAlbumAccessCookie(albumId: string, passwordHash: string, cookieValue: string | undefined): boolean {
  if (!cookieValue) return false
  return cookieValue === computeAlbumAccessToken(albumId, passwordHash)
}
