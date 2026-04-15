import type { HotspotMode } from '../../../app/types'
import { prisma } from '../../utils/prisma'
import { requireAdminSession } from '../../utils/admin-session'

const validModes: HotspotMode[] = ['CLICK_THROUGH', 'LOCAL_CREDENTIALS', 'RADIUS']

export default defineEventHandler(async (event) => {
  requireAdminSession(event)

  const body = await readBody<{
    mode?: HotspotMode
    gatewayName?: string
    landingPageUrl?: string | null
    sessionTimeoutMinutes?: number
    radiusClientIp?: string | null
    radiusNasIdentifier?: string | null
    radiusServer?: string | null
    radiusAuthPort?: number
    radiusAcctPort?: number
    radiusSecret?: string | null
  }>(event)

  const mode = body.mode
  const gatewayName = body.gatewayName?.trim()
  const landingPageUrl = body.landingPageUrl?.trim() || null
  const radiusClientIp = body.radiusClientIp?.trim() || null
  const radiusNasIdentifier = body.radiusNasIdentifier?.trim() || null
  const radiusServer = body.radiusServer?.trim() || null
  const radiusSecret = body.radiusSecret?.trim() || null
  const sessionTimeoutMinutes = Number(body.sessionTimeoutMinutes ?? 480)
  const radiusAuthPort = Number(body.radiusAuthPort ?? 1812)
  const radiusAcctPort = Number(body.radiusAcctPort ?? 1813)

  if (!mode || !validModes.includes(mode)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid hotspot mode' })
  }

  if (!gatewayName) {
    throw createError({ statusCode: 400, statusMessage: 'gatewayName is required' })
  }

  if (!Number.isInteger(sessionTimeoutMinutes) || sessionTimeoutMinutes <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'sessionTimeoutMinutes must be a positive integer' })
  }

  if (!Number.isInteger(radiusAuthPort) || radiusAuthPort <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'radiusAuthPort must be a positive integer' })
  }

  if (!Number.isInteger(radiusAcctPort) || radiusAcctPort <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'radiusAcctPort must be a positive integer' })
  }

  if (mode === 'RADIUS' && (!radiusServer || !radiusSecret)) {
    throw createError({ statusCode: 400, statusMessage: 'radiusServer and radiusSecret are required for RADIUS mode' })
  }

  return prisma.hotspotSettings.upsert({
    where: { settingsKey: 'default' },
    update: {
      mode,
      gatewayName,
      landingPageUrl,
      sessionTimeoutMinutes,
      radiusClientIp: mode === 'RADIUS' ? radiusClientIp : null,
      radiusNasIdentifier: mode === 'RADIUS' ? radiusNasIdentifier : null,
      radiusServer: mode === 'RADIUS' ? radiusServer : null,
      radiusAuthPort,
      radiusAcctPort,
      radiusSecret: mode === 'RADIUS' ? radiusSecret : null,
    },
    create: {
      settingsKey: 'default',
      mode,
      gatewayName,
      landingPageUrl,
      sessionTimeoutMinutes,
      radiusClientIp: mode === 'RADIUS' ? radiusClientIp : null,
      radiusNasIdentifier: mode === 'RADIUS' ? radiusNasIdentifier : null,
      radiusServer: mode === 'RADIUS' ? radiusServer : null,
      radiusAuthPort,
      radiusAcctPort,
      radiusSecret: mode === 'RADIUS' ? radiusSecret : null,
    },
  })
})