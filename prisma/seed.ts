import prisma from "../src/lib/prisma"
import bcrypt from "bcryptjs"

async function main() {
  const passwordHash = await bcrypt.hash("changeme", 12)

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash,
      role: "ADMIN",
    },
  })

  console.log(`Seeded admin user: ${admin.username} (password: changeme)`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
