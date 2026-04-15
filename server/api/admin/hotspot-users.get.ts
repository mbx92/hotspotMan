import { prisma } from '../../utils/prisma'
import { requireAdminSession } from '../../utils/admin-session'

export default defineEventHandler(async (event) => {
  requireAdminSession(event)

  return prisma.hotspotUser.findMany({
    select: {
      id: true,
      username: true,
      fullName: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
})