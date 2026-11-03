function positiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export const NOTIFICATION_POLL_INTERVAL_MS = positiveNumber(import.meta.env.VITE_NOTIFICATION_POLL_INTERVAL_MS, 30_000)
export const MAX_SRS_FILE_SIZE_MB = positiveNumber(import.meta.env.VITE_MAX_SRS_FILE_SIZE_MB, 10)
