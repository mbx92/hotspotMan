import { getHotspotSettings } from '../utils/hotspot-settings'

export default defineEventHandler(async () => {
  const settings = await getHotspotSettings()

  return {
    mode: settings.mode,
    gatewayName: settings.gatewayName,
    landingPageUrl: settings.landingPageUrl,
    sessionTimeoutMinutes: settings.sessionTimeoutMinutes,
    radiusConfigured: Boolean(settings.radiusServer && settings.radiusSecret),
  }
})