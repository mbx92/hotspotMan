interface AuthorizeClientPayload {
  mac: string
  ip: string
  username?: string
}

export async function authorizeClient(payload: AuthorizeClientPayload) {
  const config = useRuntimeConfig()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.openNdsTimeoutMs)

  try {
    const endpoint = new URL(config.openNdsAuthPath, config.openNdsBaseUrl)

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw createError({
        statusCode: 502,
        statusMessage: `OpenNDS authorization failed with status ${response.status}`,
      })
    }

    return await response.json().catch(() => ({ ok: true }))
  }
  catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw createError({ statusCode: 504, statusMessage: 'OpenNDS authorization timed out' })
    }

    if (isError(error)) {
      throw error
    }

    throw createError({ statusCode: 502, statusMessage: 'OpenNDS authorization failed' })
  }
  finally {
    clearTimeout(timeout)
  }
}