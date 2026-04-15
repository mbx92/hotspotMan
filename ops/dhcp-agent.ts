import { createServer } from 'node:http'
import { mkdir, writeFile, copyFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const config = {
  host: process.env.DHCP_AGENT_HOST || '127.0.0.1',
  port: Number(process.env.DHCP_AGENT_PORT || '4400'),
  token: process.env.DHCP_AGENT_TOKEN || '',
  stagingDir: process.env.DHCP_AGENT_STAGING_DIR || '/var/lib/hotspotman-agent/staging',
  dnsmasqTargetPath: process.env.DHCP_AGENT_DNSMASQ_PATH || '/etc/dnsmasq.d/hotspotman.conf',
  keaTargetPath: process.env.DHCP_AGENT_KEA_PATH || '/etc/kea/kea-dhcp4.conf',
  dnsmasqService: process.env.DHCP_AGENT_DNSMASQ_SERVICE || 'dnsmasq',
  keaService: process.env.DHCP_AGENT_KEA_SERVICE || 'kea-dhcp4-server',
  dnsmasqBinary: process.env.DHCP_AGENT_DNSMASQ_BINARY || 'dnsmasq',
  keaBinary: process.env.DHCP_AGENT_KEA_BINARY || 'kea-dhcp4',
}

if (!config.token) {
  throw new Error('DHCP_AGENT_TOKEN is required.')
}

type Provider = 'DNSMASQ' | 'KEA'

function json(response: import('node:http').ServerResponse, statusCode: number, payload: unknown) {
  response.statusCode = statusCode
  response.setHeader('content-type', 'application/json')
  response.end(JSON.stringify(payload))
}

function readBody(request: import('node:http').IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    let raw = ''
    request.setEncoding('utf8')
    request.on('data', (chunk) => {
      raw += chunk

      if (raw.length > 1024 * 1024) {
        reject(new Error('Body too large'))
      }
    })
    request.on('end', () => resolve(raw))
    request.on('error', reject)
  })
}

function verifyAuth(request: import('node:http').IncomingMessage) {
  const header = request.headers.authorization || ''
  return header === `Bearer ${config.token}`
}

async function validateConfig(provider: Provider, path: string) {
  if (provider === 'DNSMASQ') {
    await execFileAsync(config.dnsmasqBinary, ['--test', `--conf-file=${path}`])
    return
  }

  await execFileAsync(config.keaBinary, ['-t', '-c', path])
}

async function reloadService(provider: Provider) {
  const service = provider === 'DNSMASQ' ? config.dnsmasqService : config.keaService
  await execFileAsync('systemctl', ['reload', service])
}

async function applyConfig(provider: Provider, renderedConfig: string) {
  const targetPath = provider === 'DNSMASQ' ? config.dnsmasqTargetPath : config.keaTargetPath
  const stagingPath = join(config.stagingDir, provider === 'DNSMASQ' ? 'dnsmasq.conf' : 'kea-dhcp4.conf')

  await mkdir(dirname(stagingPath), { recursive: true })
  await writeFile(stagingPath, renderedConfig, 'utf8')
  await validateConfig(provider, stagingPath)
  await mkdir(dirname(targetPath), { recursive: true })
  await copyFile(stagingPath, targetPath)
  await reloadService(provider)

  return {
    ok: true,
    provider,
    message: `${provider} configuration validated and reloaded successfully.`,
  }
}

const server = createServer(async (request, response) => {
  if (!verifyAuth(request)) {
    json(response, 401, { ok: false, message: 'Unauthorized' })
    return
  }

  if (request.method === 'GET' && request.url === '/status') {
    json(response, 200, {
      ok: true,
      service: 'hotspotman-dhcp-agent',
      reachable: true,
      dnsmasqTargetPath: config.dnsmasqTargetPath,
      keaTargetPath: config.keaTargetPath,
      message: 'Agent reachable on localhost with bearer token protection.',
    })
    return
  }

  if (request.method === 'POST' && request.url === '/apply') {
    try {
      const rawBody = await readBody(request)
      const body = JSON.parse(rawBody || '{}') as { provider?: Provider, config?: string }

      if ((body.provider !== 'DNSMASQ' && body.provider !== 'KEA') || !body.config) {
        json(response, 400, { ok: false, message: 'provider and config are required.' })
        return
      }

      const result = await applyConfig(body.provider, body.config)
      json(response, 200, result)
      return
    }
    catch (error) {
      json(response, 500, {
        ok: false,
        message: error instanceof Error ? error.message : 'Failed to apply configuration.',
      })
      return
    }
  }

  json(response, 404, { ok: false, message: 'Not found' })
})

server.listen(config.port, config.host, () => {
  console.log(`hotspotman-dhcp-agent listening on http://${config.host}:${config.port}`)
})