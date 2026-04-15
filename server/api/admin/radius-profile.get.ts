import { requireAdminSession } from '../../utils/admin-session'
import { getHotspotSettings } from '../../utils/hotspot-settings'

export default defineEventHandler(async (event) => {
  requireAdminSession(event)

  const settings = await getHotspotSettings()
  const shortName = settings.radiusNasIdentifier || 'opennds-gateway'
  const ipaddr = settings.radiusClientIp || '192.168.30.1'
  const secret = settings.radiusSecret || 'replace-with-shared-secret'

  return {
    mode: settings.mode,
    openNds: {
      gatewayName: settings.gatewayName,
      sessionTimeoutMinutes: settings.sessionTimeoutMinutes,
      radiusServer: settings.radiusServer,
      radiusAuthPort: settings.radiusAuthPort,
      radiusAcctPort: settings.radiusAcctPort,
      radiusSecret: settings.radiusSecret,
      radiusNasIdentifier: settings.radiusNasIdentifier,
      radiusClientIp: settings.radiusClientIp,
    },
    freeRadiusClientSnippet: `client ${shortName} {\n  ipaddr = ${ipaddr}\n  secret = ${secret}\n  shortname = ${shortName}\n}`,
  }
})