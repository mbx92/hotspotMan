import type { DhcpProvider } from '../../app/types'
import { prisma } from './prisma'

const defaultDhcpSettings = {
  settingsKey: 'default',
  provider: 'DNSMASQ' as const,
  enabled: true,
  interfaceName: 'br-lan',
  listenAddress: null,
  subnet: '192.168.30.0/24',
  rangeStart: '192.168.30.50',
  rangeEnd: '192.168.30.200',
  routerIp: '192.168.30.1',
  dnsServers: '1.1.1.1,8.8.8.8',
  domainName: null,
  leaseTime: '12h',
  dnsmasqConfigPath: '/etc/dnsmasq.d/hotspotman.conf',
  keaConfigPath: '/etc/kea/kea-dhcp4.conf',
}

export async function getDhcpSettings() {
  return prisma.dhcpSettings.upsert({
    where: { settingsKey: 'default' },
    update: {},
    create: defaultDhcpSettings,
  })
}

export async function getDhcpReservations() {
  const settings = await getDhcpSettings()

  return prisma.dhcpReservation.findMany({
    where: { dhcpSettingsId: settings.id },
    orderBy: { createdAt: 'desc' },
  })
}

function parseDnsServers(dnsServers: string) {
  return dnsServers.split(',').map((item) => item.trim()).filter(Boolean)
}

export function renderDnsmasqConfig(settings: Awaited<ReturnType<typeof getDhcpSettings>>, reservations: Awaited<ReturnType<typeof getDhcpReservations>>) {
  const dnsServers = parseDnsServers(settings.dnsServers)
  const lines = [
    '# Managed by HotspotMan DHCP admin module',
    `interface=${settings.interfaceName}`,
    settings.listenAddress ? `listen-address=${settings.listenAddress}` : '',
    settings.enabled ? 'dhcp-authoritative' : '# DHCP disabled in admin panel',
    settings.enabled ? `dhcp-range=${settings.rangeStart},${settings.rangeEnd},${settings.leaseTime}` : '',
    settings.enabled ? `dhcp-option=option:router,${settings.routerIp}` : '',
    settings.enabled && dnsServers.length ? `dhcp-option=option:dns-server,${dnsServers.join(',')}` : '',
    settings.domainName ? `domain=${settings.domainName}` : '',
    ...reservations.map((reservation) => {
      const hostname = reservation.hostname ? `,${reservation.hostname}` : ''
      return `dhcp-host=${reservation.mac}${hostname},${reservation.ip}`
    }),
  ].filter(Boolean)

  return lines.join('\n') + '\n'
}

export function renderKeaConfig(settings: Awaited<ReturnType<typeof getDhcpSettings>>, reservations: Awaited<ReturnType<typeof getDhcpReservations>>) {
  const dnsServers = parseDnsServers(settings.dnsServers)

  return JSON.stringify({
    Dhcp4: {
      'interfaces-config': {
        interfaces: [settings.interfaceName],
      },
      'lease-database': {
        type: 'memfile',
        persist: true,
        name: '/var/lib/kea/dhcp4.leases',
      },
      'valid-lifetime': Math.max(300, normalizeLeaseTimeToSeconds(settings.leaseTime)),
      'renew-timer': 900,
      'rebind-timer': 1800,
      subnet4: [
        {
          subnet: settings.subnet,
          pools: settings.enabled
            ? [{ pool: `${settings.rangeStart} - ${settings.rangeEnd}` }]
            : [],
          'option-data': [
            {
              name: 'routers',
              data: settings.routerIp,
            },
            {
              name: 'domain-name-servers',
              data: dnsServers.join(', '),
            },
            ...(settings.domainName
              ? [{ name: 'domain-name', data: settings.domainName }]
              : []),
          ],
          reservations: reservations.map((reservation) => ({
            'hw-address': reservation.mac,
            'ip-address': reservation.ip,
            ...(reservation.hostname ? { hostname: reservation.hostname } : {}),
          })),
        },
      ],
    },
  }, null, 2)
}

function normalizeLeaseTimeToSeconds(value: string) {
  const normalized = value.trim().toLowerCase()

  if (/^\d+$/.test(normalized)) {
    return Number(normalized)
  }

  const match = normalized.match(/^(\d+)([smhd])$/)

  if (!match) {
    return 43200
  }

  const amount = Number(match[1])
  const unit = match[2]

  switch (unit) {
    case 's':
      return amount
    case 'm':
      return amount * 60
    case 'h':
      return amount * 60 * 60
    case 'd':
      return amount * 60 * 60 * 24
    default:
      return 43200
  }
}

export async function getDhcpPreview() {
  const [settings, reservations] = await Promise.all([getDhcpSettings(), getDhcpReservations()])

  return {
    provider: settings.provider as DhcpProvider,
    dnsmasqConfig: renderDnsmasqConfig(settings, reservations),
    keaConfig: renderKeaConfig(settings, reservations),
  }
}

export async function getDhcpAgentStatus() {
  const config = useRuntimeConfig()

  if (!config.dhcpAgentToken) {
    return {
      ok: false,
      service: 'hotspotman-dhcp-agent',
      reachable: false,
      dnsmasqTargetPath: '',
      keaTargetPath: '',
      message: 'NUXT_DHCP_AGENT_TOKEN is not configured.',
    }
  }

  try {
    const response = await fetch(new URL('/status', config.dhcpAgentBaseUrl), {
      headers: {
        authorization: `Bearer ${config.dhcpAgentToken}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Agent responded with ${response.status}`)
    }

    return await response.json()
  }
  catch (error) {
    return {
      ok: false,
      service: 'hotspotman-dhcp-agent',
      reachable: false,
      dnsmasqTargetPath: '',
      keaTargetPath: '',
      message: error instanceof Error ? error.message : 'Failed to contact DHCP agent.',
    }
  }
}

export async function applyDhcpConfig(provider: DhcpProvider) {
  const config = useRuntimeConfig()

  if (!config.dhcpAgentToken) {
    throw createError({ statusCode: 500, statusMessage: 'DHCP agent token is not configured.' })
  }

  const preview = await getDhcpPreview()
  const renderedConfig = provider === 'DNSMASQ' ? preview.dnsmasqConfig : preview.keaConfig

  const response = await fetch(new URL('/apply', config.dhcpAgentBaseUrl), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${config.dhcpAgentToken}`,
    },
    body: JSON.stringify({
      provider,
      config: renderedConfig,
    }),
  })

  if (!response.ok) {
    const message = await response.text().catch(() => 'Failed to apply DHCP configuration.')
    throw createError({ statusCode: 502, statusMessage: message || 'Failed to apply DHCP configuration.' })
  }

  return response.json()
}