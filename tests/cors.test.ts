import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../src/services/orchestrator.js', () => ({
  orchestrator: {
    enqueue: vi.fn().mockResolvedValue({ id: 'job-abc' }),
    getJob: vi.fn(),
    listJobs: vi.fn().mockResolvedValue([]),
  },
}))

const originalCorsOrigin = process.env.CORS_ORIGIN

function restoreEnv(name: 'CORS_ORIGIN', original: string | undefined): void {
  if (original === undefined) {
    delete process.env[name]
  } else {
    process.env[name] = original
  }
}

// `app` reads CORS_ORIGIN once at import, so each test re-imports it after setting env.
async function loadApp() {
  vi.resetModules()
  const mod = await import('../src/app.js')
  return mod.app
}

describe('api-core CORS', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.CORS_ORIGIN
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    restoreEnv('CORS_ORIGIN', originalCorsOrigin)
  })

  it('sends no access-control-allow-origin when CORS_ORIGIN is unset', async () => {
    const app = await loadApp()
    const res = await app.fetch(
      new Request('http://localhost/health', {
        headers: { Origin: 'https://app.example' },
      }),
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('returns no allow-origin header for an arbitrary local origin when CORS_ORIGIN is unset', async () => {
    const app = await loadApp()
    const res = await app.fetch(
      new Request('http://localhost/health', {
        headers: { Origin: 'http://localhost:3000' },
      }),
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('does not echo a foreign origin when CORS_ORIGIN is set to a different origin', async () => {
    vi.stubEnv('CORS_ORIGIN', 'https://a.example')
    const app = await loadApp()
    // Positive control: the configured origin is honoured by this same app instance.
    const allowed = await app.fetch(
      new Request('http://localhost/health', {
        headers: { Origin: 'https://a.example' },
      }),
    )
    expect(allowed.headers.get('access-control-allow-origin')).toBe('https://a.example')
    const res = await app.fetch(
      new Request('http://localhost/health', {
        headers: { Origin: 'https://evil.example' },
      }),
    )
    const allowOrigin = res.headers.get('access-control-allow-origin')
    expect(allowOrigin).not.toBe('https://evil.example')
    expect([null, 'https://a.example']).toContain(allowOrigin)
  })

  it('answers a preflight for the configured origin with that origin and credentials', async () => {
    vi.stubEnv('CORS_ORIGIN', 'https://a.example')
    const app = await loadApp()
    const res = await app.fetch(
      new Request('http://localhost/api/v1/research', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://a.example',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type',
        },
      }),
    )
    expect(res.headers.get('access-control-allow-origin')).toBe('https://a.example')
    expect(res.headers.get('access-control-allow-credentials')).toBe('true')
  })
})
