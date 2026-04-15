import type { DhcpProvider } from '../../../app/types'
import { requireAdminSession } from '../../utils/admin-session'
import { prisma } from '../../utils/prisma'
import { getDhcpSettings } from '../../utils/dhcp'

const validProviders: DhcpProvider[] = ['DNSMASQ', 'KEA']

export default defineEventHandler(async (event) => {
  requireAdminSession(event)

  const body = await readBody<{
    provider?: DhcpProvider
    enabled?: boolean
    interfaceName?: string
    listenAddress?: string | null
    subnet?: string
    rangeStart?: string
    rangeEnd?: string
    routerIp?: string
    dnsServers?: string
    domainName?: string | null
    leaseTime?: string
    dnsmasqConfigPath?: string | null
    keaConfigPath?: string | null
  }>(event)

  if (!body.provider || !validProviders.includes(body.provider)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid DHCP provider.' })
  }

  const interfaceName = body.interfaceName?.trim()
  const subnet = body.subnet?.trim()
  const rangeStart = body.rangeStart?.trim()
  const rangeEnd = body.rangeEnd?.trim()
  const routerIp = body.routerIp?.trim()
  const dnsServers = body.dnsServers?.trim()
  const leaseTime = body.leaseTime?.trim()

  if (!interfaceName || !subnet || !rangeStart || !rangeEnd || !routerIp || !dnsServers || !leaseTime) {
    throw createError({ statusCode: 400, statusMessage: 'Interface, subnet, range, router, DNS, and lease time are required.' })
  }

  const settings = await getDhcpSettings()

  return prisma.dhcpSettings.update({
    where: { id: settings.id },
    data: {
      provider: body.provider,
      enabled: body.enabled ?? true,
      interfaceName,
      listenAddress: body.listenAddress?.trim() || null,
      subnet,
      rangeStart,
      rangeEnd,
      routerIp,
      dnsServers,
      domainName: body.domainName?.trim() || null,
      leaseTime,
      dnsmasqConfigPath: body.dnsmasqConfigPath?.trim() || null,
      keaConfigPath: body.keaConfigPath?.trim() || null,
    },
  })
})