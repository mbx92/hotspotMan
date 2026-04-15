import bcrypt from 'bcryptjs'
import { prisma } from '../../../utils/prisma'
import { requireAdminSession } from '../../../utils/admin-session'

export default defineEventHandler(async (event) => {
  requireAdminSession(event)

  const body = await readBody<{
    id?: string
    password?: string
    fullName?: string | null
    isActive?: boolean
  }>(event)

  const id = body.id?.trim()

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id is required' })
  }

  const data: {
    fullName?: string | null
    isActive?: boolean
    passwordHash?: string
  } = {}

  if (body.fullName !== undefined) {
    data.fullName = body.fullName?.trim() || null
  }

  if (body.isActive !== undefined) {
    data.isActive = body.isActive
  }

  if (body.password) {
    data.passwordHash = await bcrypt.hash(body.password, 12)
  }

  return prisma.hotspotUser.update({
    where: { id },
    data,
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