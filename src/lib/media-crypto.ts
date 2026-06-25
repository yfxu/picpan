import { randomBytes, createCipheriv, createDecipheriv } from "crypto"

export const generateKey = () => randomBytes(32).toString("hex")
export const generateIv  = () => randomBytes(12).toString("hex")

// Output layout: ciphertext || 16-byte GCM auth tag
export function encryptBuffer(plaintext: Buffer, keyHex: string, ivHex: string): Buffer {
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(keyHex, "hex"), Buffer.from(ivHex, "hex"))
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
  return Buffer.concat([ciphertext, cipher.getAuthTag()])
}

// Input layout: ciphertext || 16-byte GCM auth tag (as written by encryptBuffer)
export function decryptBuffer(encrypted: Buffer, keyHex: string, ivHex: string): Buffer {
  const authTag = encrypted.subarray(encrypted.length - 16)
  const ciphertext = encrypted.subarray(0, encrypted.length - 16)
  const decipher = createDecipheriv("aes-256-gcm", Buffer.from(keyHex, "hex"), Buffer.from(ivHex, "hex"))
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}
