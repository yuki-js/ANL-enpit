/**
 * Lightweight storage + validation helper for Azure OpenAI configuration.
 *
 * Responsibilities:
 * - Persist minimal config in localStorage (key, endpoint, deploymentName, lastValidatedAt)
 * - Provide masked view of API key for UI
 * - Provide simple validation helpers
 * - Provide a testConnection method (best-effort HTTP probe) that callers can invoke.
 *
 * Notes:
 * - This is purely frontend-side storage. For production secrets consider a secure backend vault.
 * - The module uses localStorage by default; storage implementation can be swapped by
 *   passing a Storage-like object if needed.
 */

export interface AzureOpenAIConfigShape {
  apiKey?: string
  endpoint?: string
  deploymentName?: string
  apiVersion?: string
  lastValidatedAt?: string | null // ISO timestamp
}

const STORAGE_KEY = 'azureOpenai.config.v1'
const DEFAULT_API_VERSION = '2024-10-01-preview'

export class AzureOpenAIConfig {
  private storage: Storage
  private memo: AzureOpenAIConfigShape

  constructor(storage: Storage = window.localStorage) {
    this.storage = storage
    this.memo = this.loadFromStorage()
  }

  private loadFromStorage(): AzureOpenAIConfigShape {
    try {
      const raw = this.storage.getItem(STORAGE_KEY)
      if (!raw) return {}
      return JSON.parse(raw) as AzureOpenAIConfigShape
    } catch (err) {
      console.error('Failed to parse AzureOpenAI config from storage:', err)
      return {}
    }
  }

  private saveToStorage() {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.memo))
    } catch (err) {
      console.error('Failed to save AzureOpenAI config to storage:', err)
    }
  }

  // --- getters / setters ---

  get endpoint(): string | undefined {
    return this.memo.endpoint
  }

  set endpoint(value: string | undefined) {
    this.memo.endpoint = value
    this.saveToStorage()
  }

  get deploymentName(): string | undefined {
    return this.memo.deploymentName
  }

  set deploymentName(value: string | undefined) {
    this.memo.deploymentName = value
    this.saveToStorage()
  }

  get apiVersion(): string {
    return this.memo.apiVersion || DEFAULT_API_VERSION
  }

  set apiVersion(value: string | undefined) {
    this.memo.apiVersion = value || DEFAULT_API_VERSION
    this.saveToStorage()
  }

  // Store API key raw (be careful - this persists in localStorage)
  set apiKey(value: string | undefined) {
    this.memo.apiKey = value
    this.saveToStorage()
  }

  // Returns raw key (may be undefined)
  get apiKey(): string | undefined {
    return this.memo.apiKey
  }

  // Masked view for UI: show first 4 and last 4 characters, rest as •
  get maskedApiKey(): string | undefined {
    const k = this.memo.apiKey
    if (!k) return undefined
    if (k.length <= 8) return k.replace(/./g, '•')
    const head = k.slice(0, 4)
    const tail = k.slice(-4)
    const middle = '•'.repeat(Math.max(0, k.length - 8))
    return `${head}${middle}${tail}`
  }

  clear() {
    this.memo = {}
    try {
      this.storage.removeItem(STORAGE_KEY)
    } catch (err) {
      console.error('Failed to remove AzureOpenAI config from storage:', err)
    }
  }

  // Return a readonly snapshot suitable for UI or telemetry (omit raw key unless explicitly requested)
  snapshot(includeRawKey = false): AzureOpenAIConfigShape {
    const base: AzureOpenAIConfigShape = {
      endpoint: this.memo.endpoint,
      deploymentName: this.memo.deploymentName,
      apiVersion: this.apiVersion,
      lastValidatedAt: this.memo.lastValidatedAt ?? null,
    }
    if (includeRawKey) {
      base.apiKey = this.memo.apiKey
    } else if (this.memo.apiKey) {
      base.apiKey = this.maskedApiKey
    }
    return base
  }

  // Basic validators --------------------------------

  // Azure OpenAI apiKey looks like a long GUID-like secret; do a lightweight check:
  // - non-empty, length > 20 (simple heuristic)
  validateApiKeyFormat(): { ok: boolean; reason?: string } {
    const k = this.memo.apiKey
    if (!k) return { ok: false, reason: 'apiKey_missing' }
    if (k.length < 20) return { ok: false, reason: 'apiKey_too_short' }
    return { ok: true }
  }

  // Endpoint should be a URL like https://{your-resource-name}.openai.azure.com/
  validateEndpointFormat(): { ok: boolean; reason?: string } {
    const e = this.memo.endpoint
    if (!e) return { ok: false, reason: 'endpoint_missing' }
    try {
      const url = new URL(e)
      if (!url.hostname.includes('openai.azure.com')) {
        return { ok: false, reason: 'endpoint_not_openai_azure' }
      }
      return { ok: true }
    } catch (err) {
      return { ok: false, reason: 'endpoint_invalid_url' }
    }
  }

  // Deployment name should be a non-empty token (no spaces)
  validateDeploymentName(): { ok: boolean; reason?: string } {
    const d = this.memo.deploymentName
    if (!d) return { ok: false, reason: 'deployment_missing' }
    if (/\s/.test(d)) return { ok: false, reason: 'deployment_invalid_chars' }
    return { ok: true }
  }

  // API version should look like a date-based version or preview label e.g. 2024-10-01-preview
  validateApiVersion(): { ok: boolean; reason?: string } {
    const v = this.apiVersion
    if (!v) return { ok: false, reason: 'apiversion_missing' }
    // very light heuristic
    if (!/^\d{4}-\d{2}-\d{2}(-preview)?$/.test(v)) {
      return { ok: false, reason: 'apiversion_invalid_format' }
    }
    return { ok: true }
  }

  // Aggregate validity check
  validateAll(): { ok: boolean; errors: string[] } {
    const errors: string[] = []
    const a = this.validateApiKeyFormat()
    if (!a.ok) errors.push(a.reason || 'apiKey_invalid')
    const b = this.validateEndpointFormat()
    if (!b.ok) errors.push(b.reason || 'endpoint_invalid')
    const c = this.validateDeploymentName()
    if (!c.ok) errors.push(c.reason || 'deployment_invalid')
    const d = this.validateApiVersion()
    if (!d.ok) errors.push(d.reason || 'apiversion_invalid')
    return { ok: errors.length === 0, errors }
  }

  // Helper: Build Azure OpenAI Realtime URL from current settings.
  // Example:
  // https://{resource}.openai.azure.com/openai/realtime?api-version=2024-10-01-preview&deployment={deployment}
  buildRealtimeUrl(): string | null {
    const { endpoint, deploymentName } = this.memo
    if (!endpoint || !deploymentName) return null
    const base = endpoint.replace(/\/$/, '')
    const v = encodeURIComponent(this.apiVersion)
    const d = encodeURIComponent(deploymentName)
    return `${base}/openai/realtime?api-version=${v}&deployment=${d}`
  }

  // Build a WebSocket URL for Realtime (wss) and optionally append api-key as query
  // Note: In browsers, setting 'api-key' as a connection header on the WebSocket handshake is not possible,
  // so Azure docs allow using the 'api-key' query parameter over wss.
  buildRealtimeWebSocketUrl(includeKey = false): string | null {
    const httpUrl = this.buildRealtimeUrl()
    if (!httpUrl) return null
    const wsUrl = httpUrl.replace(/^http/i, 'ws') // https -> wss, http -> ws
    if (!includeKey) return wsUrl
    const url = new URL(wsUrl)
    const key = this.memo.apiKey
    if (key) {
      url.searchParams.set('api-key', key)
    }
    return url.toString()
  }
  // Build WebSocket URL from arbitrary input URL and apiKey without mutating state
  buildRealtimeWebSocketUrlFrom(inputUrl: string, apiKey?: string): string | null {
    const parsed = this.parseRealtimeUrl(inputUrl)
    if (!parsed) return null
    const base = `${parsed.endpoint.replace(/\/$/, '')}/openai/realtime?api-version=${encodeURIComponent(parsed.apiVersion)}&deployment=${encodeURIComponent(parsed.deploymentName)}`
    let wsUrl = base.replace(/^http/i, 'ws') // https->wss / http->ws
    if (apiKey) {
      const url = new URL(wsUrl)
      url.searchParams.set('api-key', apiKey)
      wsUrl = url.toString()
    }
    return wsUrl
  }

  // Test connection with provided URL/apiKey without persisting settings unless persistOnSuccess=true
  async testConnectionWith(
    inputUrl: string,
    apiKey?: string,
    timeoutMs = 5000,
    persistOnSuccess = false,
  ): Promise<{ ok: boolean; status?: number; error?: string }> {
    const wsUrl = this.buildRealtimeWebSocketUrlFrom(inputUrl, apiKey)
    if (!wsUrl) return { ok: false, error: 'missing_parameters' }

    return new Promise((resolve) => {
      let settled = false
      let opened = false
      let socket: WebSocket | null = null

      const timer = setTimeout(() => {
        if (settled) return
        settled = true
        try { socket?.close() } catch {}
        resolve({ ok: false, error: 'timeout' })
      }, timeoutMs)

      try {
        socket = new WebSocket(wsUrl)
      } catch (err: any) {
        clearTimeout(timer)
        return resolve({ ok: false, error: String(err) })
      }

      socket.onopen = () => {
        opened = true
        if (settled) return
        settled = true
        clearTimeout(timer)
        try { socket?.close() } catch {}

        // Optionally persist on success (URL fields + apiKey)
        if (persistOnSuccess) {
          this.setFromRealtimeUrl(inputUrl)
          this.apiKey = apiKey || undefined
          // Record last validated time when persisting success
          this.memo.lastValidatedAt = new Date().toISOString()
          this.saveToStorage()
        }

        resolve({ ok: true, status: 101 }) // WebSocket Switching Protocols
      }

      socket.onerror = () => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve({ ok: false, error: 'websocket_error' })
      }

      socket.onclose = (event) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve({ ok: opened, status: event.code, error: opened ? undefined : `websocket_closed:${event.code}` })
      }
    })
  }
  // Parse a pasted Realtime URL and extract endpoint, apiVersion, deployment
  // Accepts formats like:
  // https://{resource}.openai.azure.com/openai/realtime?api-version=2024-10-01-preview&amp;deployment=gpt-realtime
  // Returns a normalized object or null if not parseable.
  parseRealtimeUrl(input: string): { endpoint: string; apiVersion: string; deploymentName: string } | null {
    if (!input) return null
    try {
      const url = new URL(input)
      // Must contain /openai/realtime path
      if (!/\/openai\/realtime\/?$/.test(url.pathname)) return null

      const apiVersion = url.searchParams.get('api-version') || this.apiVersion
      const deploymentName = url.searchParams.get('deployment') || this.memo.deploymentName || ''
      // Endpoint is the resource root, without trailing slash
      const endpoint = `${url.origin}`

      if (!apiVersion || !deploymentName) return null
      return {
        endpoint,
        apiVersion,
        deploymentName,
      }
    } catch {
      return null
    }
  }

  // Convenience: set fields from a pasted Realtime URL. Returns true if applied.
  setFromRealtimeUrl(input: string): boolean {
    const parsed = this.parseRealtimeUrl(input)
    if (!parsed) return false
    this.endpoint = parsed.endpoint
    this.apiVersion = parsed.apiVersion
    this.deploymentName = parsed.deploymentName
    return true
  }

  // Test connection for Azure OpenAI Realtime:
  // - Perform a WebSocket handshake to the /realtime endpoint.
  // - In browsers, auth must be supplied via 'api-key' query parameter (per Azure samples).
  // - Success if the socket opens; then immediately close it.
  async testConnection(timeoutMs = 5000): Promise<{ ok: boolean; status?: number; error?: string }> {
    const wsUrl = this.buildRealtimeWebSocketUrl?.(true) || null
    if (!wsUrl) return { ok: false, error: 'missing_parameters' }

    return new Promise((resolve) => {
      let settled = false
      let opened = false
      let socket: WebSocket | null = null

      const timer = setTimeout(() => {
        if (settled) return
        settled = true
        try { socket?.close() } catch {}
        resolve({ ok: false, error: 'timeout' })
      }, timeoutMs)

      try {
        socket = new WebSocket(wsUrl)
      } catch (err: any) {
        clearTimeout(timer)
        return resolve({ ok: false, error: String(err) })
      }

      socket.onopen = () => {
        opened = true
        if (settled) return
        settled = true
        clearTimeout(timer)
        try { socket?.close() } catch {}
        this.memo.lastValidatedAt = new Date().toISOString()
        this.saveToStorage()
        resolve({ ok: true, status: 101 }) // 101 Switching Protocols (WebSocket)
      }

      socket.onerror = () => {
        // onerror may not provide rich info; treat as failure if not opened
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve({ ok: false, error: 'websocket_error' })
      }

      socket.onclose = (event) => {
        // If we never opened successfully, treat as failure; otherwise already resolved on open
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve({ ok: opened, status: event.code, error: opened ? undefined : `websocket_closed:${event.code}` })
      }
    })
  }
}

export default AzureOpenAIConfig