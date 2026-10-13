import type { SelectHTMLAttributes } from 'react'

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  options: Array<{ value: string; label: string }>
}

export function Select({ label, id, options, className = '', ...props }: SelectProps) {
  return <div className="select-field">
    {label && <label className="select-field__label" htmlFor={id}>{label}</label>}
    <select id={id} className={`select-control ${className}`.trim()} {...props}>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </div>
}
