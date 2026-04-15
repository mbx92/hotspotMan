import { prisma } from './prisma'

const defaultHotspotSettings = {
  settingsKey: 'default',
  mode: 'CLICK_THROUGH' as const,
  gatewayName: 'Hospital Wi-Fi',
  landingPageUrl: null,
  sessionTimeoutMinutes: 480,
  radiusClientIp: null,
  radiusNasIdentifier: null,
  radiusServer: null,
  radiusAuthPort: 1812,
  radiusAcctPort: 1813,
  radiusSecret: null,
}

export async function getHotspotSettings() {
  return prisma.hotspotSettings.upsert({
    where: { settingsKey: 'default' },
    update: {},
    create: defaultHotspotSettings,
  })
}

export function getDefaultHotspotSettings() {
  return defaultHotspotSettings
}