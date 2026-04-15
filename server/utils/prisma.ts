import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { PrismaClient } from '../../app/generated/prisma/client'

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient
  prismaPool?: Pool
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured.')
  }

  const pool = new Pool({ connectionString: databaseUrl })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  return { prisma, pool }
}

const existing = globalForPrisma.prisma && globalForPrisma.prismaPool
  ? { prisma: globalForPrisma.prisma, pool: globalForPrisma.prismaPool }
  : createPrismaClient()

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = existing.prisma
}

if (!globalForPrisma.prismaPool) {
  globalForPrisma.prismaPool = existing.pool
}

export const prisma = existing.prisma