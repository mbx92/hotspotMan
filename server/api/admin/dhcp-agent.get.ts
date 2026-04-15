import { requireAdminSession } from '../../utils/admin-session'
import { getDhcpAgentStatus } from '../../utils/dhcp'

export default defineEventHandler(async (event) => {
  requireAdminSession(event)
  return getDhcpAgentStatus()
})