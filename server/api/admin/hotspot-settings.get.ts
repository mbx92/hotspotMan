import { requireAdminSession } from '../../utils/admin-session'
import { getHotspotSettings } from '../../utils/hotspot-settings'

export default defineEventHandler(async (event) => {
  requireAdminSession(event)

  return getHotspotSettings()
})