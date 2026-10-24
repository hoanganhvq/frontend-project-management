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

async function readError(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) return response.json().catch(() => null)
  return response.text().catch(() => '')
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, credentials: 'include' })
  if (!response.ok) {
    const details = await readError(response)
    const payload = details && typeof details === 'object' ? details as Record<string, unknown> : null
    const detailMessage = typeof details === 'string' ? details : payload
      ? [payload.message, payload.error, payload.detail].find((value): value is string => typeof value === 'string')
      : undefined
    const message = detailMessage || `Request failed (${response.status})`
    throw new ApiError(message, response.status, details)
  }
  if (response.status === 204) return undefined as T
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) return response.json() as Promise<T>
  return response.text() as Promise<T>
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}
