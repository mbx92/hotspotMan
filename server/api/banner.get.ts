import { prisma } from '../utils/prisma'

export default defineEventHandler(async () => {
  const banner = await prisma.banner.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  })

  return { banner }
})