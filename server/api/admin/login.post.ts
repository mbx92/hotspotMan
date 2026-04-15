import bcrypt from 'bcryptjs'
import { prisma } from '../../utils/prisma'
import { setAdminSessionCookie } from '../../utils/admin-session'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ username?: string, password?: string }>(event)
  const username = body.username?.trim()
  const password = body.password || ''

  if (!username || !password) {
    throw createError({ statusCode: 400, statusMessage: 'username and password are required' })
  }

  const admin = await prisma.admin.findUnique({
    where: { username },
  })

  if (!admin) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

  const isValid = await bcrypt.compare(password, admin.passwordHash)

  if (!isValid) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

  setAdminSessionCookie(event, admin.id)

  return {
    authenticated: true,
    token: getCookie(event, 'mm_admin_session'),
  }
})