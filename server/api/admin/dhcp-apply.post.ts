import type { DhcpProvider } from '../../../app/types'
import { requireAdminSession } from '../../utils/admin-session'
import { applyDhcpConfig, getDhcpSettings } from '../../utils/dhcp'

export default defineEventHandler(async (event) => {
  requireAdminSession(event)

  const body = await readBody<{ provider?: DhcpProvider }>(event)
  const settings = await getDhcpSettings()
  const provider = body.provider || settings.provider

  return applyDhcpConfig(provider)
})