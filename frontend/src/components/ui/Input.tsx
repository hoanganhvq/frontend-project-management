import type { InputHTMLAttributes, ReactNode } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  leadingIcon?: ReactNode
  label?: string
  hint?: string
  error?: string
}

export function Input({ leadingIcon, label, hint, error, id, className = '', ...props }: InputProps) {
  const disabled = props.disabled
  const messageId = id && (error || hint) ? `${id}-${error ? 'error' : 'hint'}` : undefined
  return <div className="input-field">
    {label && <label className="input-field__label" htmlFor={id}>{label}</label>}
    <span className={`input-field__control${error ? ' input-field__control--error' : ''}${disabled ? ' input-field__control--disabled' : ''}${className ? ` ${className}` : ''}`}>
      {leadingIcon}
      <input id={id} aria-invalid={error ? true : undefined} aria-describedby={messageId} {...props} />
    </span>
    {error && <span className="input-field__message input-field__message--error" id={messageId}>{error}</span>}
    {!error && hint && <span className="input-field__message" id={messageId}>{hint}</span>}
  </div>
}
