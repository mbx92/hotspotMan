import type { H3Event } from 'h3'

export function getClientIp(event: H3Event) {
  const forwarded = getHeader(event, 'x-forwarded-for')

  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || ''
  }

  const realIp = getHeader(event, 'x-real-ip')

  if (realIp) {
    return realIp.trim()
  }

  return event.node.req.socket.remoteAddress || ''
}

export function normalizeIp(ip: string) {
  return ip.replace(/^::ffff:/, '')
}