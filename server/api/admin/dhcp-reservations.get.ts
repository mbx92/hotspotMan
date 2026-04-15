import { requireAdminSession } from '../../utils/admin-session'
import { getDhcpReservations } from '../../utils/dhcp'

export default defineEventHandler(async (event) => {
  requireAdminSession(event)
  return getDhcpReservations()
})