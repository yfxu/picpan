import { NextResponse } from "next/server"
import { prisma } from "../../../lib/prisma"

export async function POST(req: Request) {
  const existing = await prisma.instance.findFirst()
  if (existing) {
    return NextResponse.json({ error: "Already configured" }, { status: 409 })
  }

  const body = await req.json()
  const { s3Provider, s3Endpoint, s3Region, s3Bucket, s3AccessKey, s3SecretKey, cdnBaseUrl } = body

  if (!s3Provider || !s3Endpoint || !s3Region || !s3Bucket || !s3AccessKey || !s3SecretKey || !cdnBaseUrl) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 })
  }

  await prisma.instance.create({
    data: { id: "singleton", s3Provider, s3Endpoint, s3Region, s3Bucket, s3AccessKey, s3SecretKey, cdnBaseUrl },
  })

  return NextResponse.json({ ok: true })
}
