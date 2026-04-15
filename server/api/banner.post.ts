import { prisma } from '../utils/prisma'
import { requireAdminSession } from '../utils/admin-session'

export default defineEventHandler(async (event) => {
  requireAdminSession(event)

  const body = await readBody<{ title?: string, imageUrl?: string, isActive?: boolean }>(event)
  const title = body.title?.trim()
  const imageUrl = body.imageUrl?.trim()

  if (!title || !imageUrl) {
    throw createError({ statusCode: 400, statusMessage: 'title and imageUrl are required' })
  }

  if (body.isActive) {
    await prisma.banner.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    })
  }

  return prisma.banner.create({
    data: {
      title,
      imageUrl,
      isActive: body.isActive ?? true,
    },
  })
})