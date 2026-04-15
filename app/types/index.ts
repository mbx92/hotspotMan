export interface BannerRecord {
  id: string
  title: string
  imageUrl: string
  isActive: boolean
  createdAt: string
}

export interface BannerResponse {
  banner: BannerRecord | null
}

export interface SessionRecord {
  id: string
  mac: string
  ip: string
  hotspotUsername: string | null
  authMode: HotspotMode
  loginAt: string
  logoutAt: string | null
}

export interface AuthorizeResponse {
  authorized: boolean
  redirectUrl: string
  sessionId: string
}

export interface PortalConfig {
  mode: HotspotMode
  gatewayName: string
  landingPageUrl: string | null
  sessionTimeoutMinutes: number
  radiusConfigured: boolean
}

export interface AdminStats {
  activeUsers: number
  sessionsToday: number
}

export interface AdminProfile {
  id: string
  username: string
  createdAt: string
}

export type HotspotMode = 'CLICK_THROUGH' | 'LOCAL_CREDENTIALS' | 'RADIUS'

export interface HotspotSettingsRecord {
  id: string
  settingsKey: string
  mode: HotspotMode
  gatewayName: string
  landingPageUrl: string | null
  sessionTimeoutMinutes: number
  radiusClientIp: string | null
  radiusNasIdentifier: string | null
  radiusServer: string | null
  radiusAuthPort: number
  radiusAcctPort: number
  radiusSecret: string | null
  updatedAt: string
}

export interface HotspotUserRecord {
  id: string
  username: string
  fullName: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface RadiusIntegrationProfile {
  mode: HotspotMode
  openNds: {
    gatewayName: string
    sessionTimeoutMinutes: number
    radiusServer: string | null
    radiusAuthPort: number
    radiusAcctPort: number
    radiusSecret: string | null
    radiusNasIdentifier: string | null
    radiusClientIp: string | null
  }
  freeRadiusClientSnippet: string
}

export type DhcpProvider = 'DNSMASQ' | 'KEA'

export interface DhcpSettingsRecord {
  id: string
  settingsKey: string
  provider: DhcpProvider
  enabled: boolean
  interfaceName: string
  listenAddress: string | null
  subnet: string
  rangeStart: string
  rangeEnd: string
  routerIp: string
  dnsServers: string
  domainName: string | null
  leaseTime: string
  dnsmasqConfigPath: string | null
  keaConfigPath: string | null
  updatedAt: string
}

export interface DhcpReservationRecord {
  id: string
  dhcpSettingsId: string
  mac: string
  ip: string
  hostname: string | null
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface DhcpPreviewResponse {
  provider: DhcpProvider
  dnsmasqConfig: string
  keaConfig: string
}

export interface DhcpAgentStatus {
  ok: boolean
  service: string
  reachable: boolean
  dnsmasqTargetPath: string
  keaTargetPath: string
  message: string
}

export interface DhcpApplyResponse {
  ok: boolean
  provider: DhcpProvider
  message: string
}