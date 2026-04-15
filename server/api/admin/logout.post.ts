import { clearAdminSessionCookie, requireAdminSession } from '../../utils/admin-session'

export default defineEventHandler((event) => {
  requireAdminSession(event)
  clearAdminSessionCookie(event)

  return { success: true }
})