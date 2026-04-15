import { prisma } from '../../utils/prisma'
import { requireAdminSession } from '../../utils/admin-session'

export default defineEventHandler(async (event) => {
  requireAdminSession(event)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [activeUsers, sessionsToday] = await Promise.all([
    prisma.session.count({ where: { logoutAt: null } }),
    prisma.session.count({ where: { loginAt: { gte: today } } }),
  ])

  return {
    activeUsers,
    sessionsToday,
  }
})