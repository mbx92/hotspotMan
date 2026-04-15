import { prisma } from '../../utils/prisma'
import { requireAdminSession } from '../../utils/admin-session'

export default defineEventHandler(async (event) => {
  const adminId = requireAdminSession(event)

  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: {
      id: true,
      username: true,
      createdAt: true,
    },
  })

  if (!admin) {
    throw createError({ statusCode: 404, statusMessage: 'Admin not found' })
  }

  return admin
})