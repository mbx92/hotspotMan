import { prisma } from '../utils/prisma'
import { requireAdminSession } from '../utils/admin-session'

export default defineEventHandler(async (event) => {
  requireAdminSession(event)

  return prisma.session.findMany({
    orderBy: {
      loginAt: 'desc',
    },
    take: 50,
  })
})