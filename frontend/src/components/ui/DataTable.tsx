import type { ReactNode } from 'react'
import { EmptyState } from './States'

export type DataColumn<Row> = {
  key: string
  header: string
  render: (row: Row) => ReactNode
  className?: string
}

type DataTableProps<Row> = {
  caption: string
  columns: DataColumn<Row>[]
  rows: Row[]
  rowKey: (row: Row) => string | number
  emptyTitle?: string
  emptyDetail?: string
}

export function DataTable<Row>({ caption, columns, rows, rowKey, emptyTitle = 'Nothing to show yet', emptyDetail = 'Items will appear here when available.' }: DataTableProps<Row>) {
  if (rows.length === 0) return <EmptyState title={emptyTitle} detail={emptyDetail} />

  return <div className="data-table-scroll">
    <table className="data-table">
      <caption className="visually-hidden">{caption}</caption>
      <thead><tr>{columns.map((column) => <th className={column.className} key={column.key} scope="col">{column.header}</th>)}</tr></thead>
      <tbody>{rows.map((row) => <tr key={rowKey(row)}>{columns.map((column) => <td className={column.className} key={column.key}>{column.render(row)}</td>)}</tr>)}</tbody>
    </table>
  </div>
}
