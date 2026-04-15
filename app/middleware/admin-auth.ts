export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/admin')) {
    return
  }

  const isLoginPage = to.path === '/admin/login'

  try {
    if (import.meta.server) {
      const requestFetch = useRequestFetch()
      await requestFetch('/api/admin/me')
    }
    else {
      await $fetch('/api/admin/me', {
        credentials: 'include',
      })
    }

    if (isLoginPage) {
      return navigateTo('/admin')
    }
  }
  catch {
    if (!isLoginPage) {
      return navigateTo('/admin/login')
    }
  }
})