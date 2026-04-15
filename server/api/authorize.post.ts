import { prisma } from '../utils/prisma'
import { authorizeClient } from '../utils/opennds'
import { getHotspotSettings } from '../utils/hotspot-settings'
import { validateHotspotUser } from '../utils/hotspot-users'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ mac?: string, ip?: string, username?: string, password?: string }>(event)
  const mac = body.mac?.trim()
  const ip = body.ip?.trim()
  const username = body.username?.trim()
  const password = body.password || ''

  if (!mac || !ip) {
    throw createError({ statusCode: 400, statusMessage: 'mac and ip are required' })
  }

  const hotspotSettings = await getHotspotSettings()
  let hotspotUserId: string | null = null
  let hotspotUsername: string | null = null

  if (hotspotSettings.mode === 'LOCAL_CREDENTIALS') {
    if (!username || !password) {
      throw createError({ statusCode: 400, statusMessage: 'username and password are required for local credentials mode' })
    }

    const hotspotUser = await validateHotspotUser(username, password)

    if (!hotspotUser) {
      throw createError({ statusCode: 401, statusMessage: 'Invalid hotspot credentials' })
    }

    hotspotUserId = hotspotUser.id
    hotspotUsername = hotspotUser.username
  }

  if (hotspotSettings.mode === 'RADIUS') {
    throw createError({ statusCode: 409, statusMessage: 'RADIUS mode is active. Configure OpenNDS to authenticate against FreeRADIUS directly.' })
  }

  await authorizeClient({ mac, ip })

  const session = await prisma.session.create({
    data: {
      mac,
      ip,
      hotspotUserId,
      hotspotUsername,
      authMode: hotspotSettings.mode,
    },
  })

  const redirectUrl = getQuery(event).redirectUrl
  const config = useRuntimeConfig()

  return {
    authorized: true,
    redirectUrl: typeof redirectUrl === 'string' && redirectUrl ? redirectUrl : hotspotSettings.landingPageUrl || config.public.portalContinueUrl,
    sessionId: session.id,
  }
})