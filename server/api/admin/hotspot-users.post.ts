import bcrypt from 'bcryptjs'
import { prisma } from '../../utils/prisma'
import { requireAdminSession } from '../../utils/admin-session'

export default defineEventHandler(async (event) => {
  requireAdminSession(event)

  const body = await readBody<{
    username?: string
    password?: string
    fullName?: string | null
    isActive?: boolean
  }>(event)

  const username = body.username?.trim()
  const password = body.password || ''
  const fullName = body.fullName?.trim() || null

  if (!username || !password) {
    throw createError({ statusCode: 400, statusMessage: 'username and password are required' })
  }

  const passwordHash = await bcrypt.hash(password, 12)

  return prisma.hotspotUser.create({
    data: {
      username,
      passwordHash,
      fullName,
      isActive: body.isActive ?? true,
    },
    select: {
      id: true,
      username: true,
      fullName: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  })
})