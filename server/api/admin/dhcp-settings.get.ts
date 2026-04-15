import { requireAdminSession } from '../../utils/admin-session'
import { getDhcpSettings } from '../../utils/dhcp'

export default defineEventHandler(async (event) => {
  requireAdminSession(event)
  return getDhcpSettings()
})