import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { PrismaClient } from '../app/generated/prisma/client'

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  const adminUsername = process.env.NUXT_ADMIN_USERNAME || 'admin'
  const adminPassword = process.env.NUXT_ADMIN_PASSWORD || 'change-me-now'

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to seed the database.')
  }

  const pool = new Pool({ connectionString: databaseUrl })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  try {
    const passwordHash = await bcrypt.hash(adminPassword, 12)

    await prisma.admin.upsert({
      where: { username: adminUsername },
      update: { passwordHash },
      create: {
        username: adminUsername,
        passwordHash,
      },
    })
  }
  finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})