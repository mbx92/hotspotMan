import { requireAdminSession } from '../../utils/admin-session'
import { getDhcpPreview } from '../../utils/dhcp'

export default defineEventHandler(async (event) => {
  requireAdminSession(event)
  return getDhcpPreview()
})