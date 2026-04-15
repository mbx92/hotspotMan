import { getClientIp, normalizeIp } from '../utils/request'
import { isIpInSubnet } from '../utils/network'

export default defineEventHandler((event) => {
  const path = event.path || ''
  const isProtectedAdminPath = path.startsWith('/admin') || path.startsWith('/api/admin') || path.startsWith('/api/sessions') || (path === '/api/banner' && event.method !== 'GET')

  if (!isProtectedAdminPath) {
    return
  }

  const ip = normalizeIp(getClientIp(event))
  const config = useRuntimeConfig()
  const isLoopback = ip === '127.0.0.1' || ip === '::1'

  if (import.meta.dev && isLoopback) {
    return
  }

  if (!ip || !isIpInSubnet(ip, config.adminAllowedSubnet)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
})