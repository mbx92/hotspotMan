import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export async function validateHotspotUser(username: string, password: string) {
  const hotspotUser = await prisma.hotspotUser.findUnique({
    where: { username },
  })

  if (!hotspotUser || !hotspotUser.isActive) {
    return null
  }

  const isValid = await bcrypt.compare(password, hotspotUser.passwordHash)

  if (!isValid) {
    return null
  }

  return hotspotUser
}