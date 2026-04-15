import { requireAdminSession } from '../../utils/admin-session'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  requireAdminSession(event)

  const body = await readBody<{
    id?: string
    mac?: string
    ip?: string
    hostname?: string | null
    description?: string | null
  }>(event)

  const id = body.id?.trim()

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id is required.' })
  }

  return prisma.dhcpReservation.update({
    where: { id },
    data: {
      mac: body.mac?.trim(),
      ip: body.ip?.trim(),
      hostname: body.hostname?.trim() || null,
      description: body.description?.trim() || null,
    },
  })
})