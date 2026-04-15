import { createHmac, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'

const COOKIE_NAME = 'mm_admin_session'

function getSecret() {
  const config = useRuntimeConfig()
  return config.adminSessionSecret
}

function sign(value: string) {
  return createHmac('sha256', getSecret()).update(value).digest('hex')
}

export function createAdminSessionValue(adminId: string) {
  const payload = `${adminId}.${Date.now()}`
  return `${payload}.${sign(payload)}`
}

export function getAdminIdFromSession(event: H3Event) {
  const cookie = getCookie(event, COOKIE_NAME)

  if (!cookie) {
    return null
  }

  const lastDotIndex = cookie.lastIndexOf('.')

  if (lastDotIndex === -1) {
    return null
  }

  const payload = cookie.slice(0, lastDotIndex)
  const signature = cookie.slice(lastDotIndex + 1)
  const expectedSignature = sign(payload)

  if (signature.length !== expectedSignature.length) {
    return null
  }

  const isValid = timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))

  if (!isValid) {
    return null
  }

  const [adminId] = payload.split('.')
  return adminId || null
}

export function setAdminSessionCookie(event: H3Event, adminId: string) {
  setCookie(event, COOKIE_NAME, createAdminSessionValue(adminId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: !import.meta.dev,
    path: '/',
    maxAge: 60 * 60 * 12,
  })
}

export function clearAdminSessionCookie(event: H3Event) {
  deleteCookie(event, COOKIE_NAME, {
    path: '/',
  })
}

export function requireAdminSession(event: H3Event) {
  const adminId = getAdminIdFromSession(event)

  if (!adminId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  return adminId
}