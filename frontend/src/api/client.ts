export class ApiError extends Error {
  readonly status: number
  readonly details: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
const inFlightGets = new Map<string, Promise<unknown>>()

async function readError(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) return response.json().catch(() => null)
  return response.text().catch(() => '')
}

async function executeRequest<T>(path: string, init: RequestInit): Promise<T> {
  const headers = new Headers(init.headers)
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData
  if (init.body && !isFormData && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, credentials: 'include' })
  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('app:unauthorized'))
    }
    const details = await readError(response)
    const payload = details && typeof details === 'object' ? details as Record<string, unknown> : null
    const detailMessage = typeof details === 'string' ? details : payload
      ? [payload.message, payload.error, payload.detail].find((value): value is string => typeof value === 'string')
      : undefined
    const message = response.status >= 500
      ? 'The service could not complete this request. Please try again.'
      : response.status === 403
        ? 'Your account does not have permission for this action.'
        : detailMessage || (response.status === 401
          ? 'You are not signed in or your account does not have permission for this action.'
          : `Request failed (${response.status})`)
    throw new ApiError(message, response.status, response.status === 403 || response.status >= 500 ? undefined : details)
  }
  if (response.status === 204) return undefined as T
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) return response.json() as Promise<T>
  return response.text() as Promise<T>
}

export function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase()
  if (method !== 'GET') return executeRequest<T>(path, init)

  const key = `${API_BASE_URL}${path}`
  const existing = inFlightGets.get(key)
  if (existing) return existing as Promise<T>

  const request = executeRequest<T>(path, init)
  inFlightGets.set(key, request)
  void request.finally(() => {
    if (inFlightGets.get(key) === request) inFlightGets.delete(key)
  }).catch(() => undefined)
  return request
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}
