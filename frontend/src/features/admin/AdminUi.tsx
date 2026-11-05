import { useEffect, useId, useState } from 'react'
import { Button } from '../../components/ui/Button'

export function Feedback({ error, retry }: { error: string; retry?: () => void }) {
  return error ? <div className="admin-feedback" role="alert"><span>{error}</span>{retry && <Button size="sm" variant="secondary" onClick={retry}>Thử lại</Button>}</div> : null
}
export function Pager({ data, page, onPage, loading, size, onSize }: { data: { totalElements: number; totalPages: number } | null; page: number; onPage: (page: number) => void; loading: boolean; size: number; onSize: (size: number) => void }) {
  const id = useId()
  const total = data?.totalElements ?? 0
  const pages = Math.max(1, data?.totalPages ?? 1)
  const disabled = loading || !data
  const first = total ? page * size + 1 : 0
  const last = Math.min((page + 1) * size, total)
  return <nav className="admin-pagination" aria-label="Phân trang">
    <span>{first}–{last} / {total} kết quả</span>
    <div className="admin-pagination-controls">
      <label htmlFor={`${id}-size`}>Số dòng/trang</label>
      <select id={`${id}-size`} value={size} disabled={loading} onChange={event => onSize(Number(event.target.value))}>{[10, 20, 50, 100].map(value => <option key={value} value={value}>{value}</option>)}</select>
      <Button size="sm" variant="secondary" disabled={disabled || page === 0} onClick={() => onPage(0)} aria-label="Trang đầu">«</Button>
      <Button size="sm" variant="secondary" disabled={disabled || page === 0} onClick={() => onPage(page - 1)}>Trước</Button>
      <label htmlFor={`${id}-page`}>Trang</label>
      <input id={`${id}-page`} type="number" min={1} max={pages} value={page + 1} disabled={disabled || total === 0} onChange={event => { const value = Number(event.target.value); if (Number.isInteger(value) && value >= 1 && value <= pages) onPage(value - 1) }} />
      <span>/ {pages}</span>
      <Button size="sm" variant="secondary" disabled={disabled || page + 1 >= pages} onClick={() => onPage(page + 1)}>Sau</Button>
      <Button size="sm" variant="secondary" disabled={disabled || page + 1 >= pages} onClick={() => onPage(pages - 1)} aria-label="Trang cuối">»</Button>
    </div>
  </nav>
}
export function useSearch() {
  const [query, setQuery] = useState('')
  const [term, setTerm] = useState('')
  useEffect(() => { const timer = window.setTimeout(() => setTerm(query.trim()), 300); return () => window.clearTimeout(timer) }, [query])
  return { query, setQuery, term }
}

