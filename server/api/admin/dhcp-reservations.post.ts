import { requireAdminSession } from '../../utils/admin-session'
import { getDhcpSettings } from '../../utils/dhcp'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  requireAdminSession(event)

  const body = await readBody<{
    mac?: string
    ip?: string
    hostname?: string | null
    description?: string | null
  }>(event)

  const mac = body.mac?.trim()
  const ip = body.ip?.trim()

  if (!mac || !ip) {
    throw createError({ statusCode: 400, statusMessage: 'mac and ip are required.' })
  }

  const settings = await getDhcpSettings()

  return prisma.dhcpReservation.create({
    data: {
      dhcpSettingsId: settings.id,
      mac,
      ip,
      hostname: body.hostname?.trim() || null,
      description: body.description?.trim() || null,
    },
  })
})