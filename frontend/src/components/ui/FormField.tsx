import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'

type DescribableControl = { id?: string; required?: boolean; 'aria-describedby'?: string; 'aria-invalid'?: boolean }

type FormFieldProps = {
  label: string
  htmlFor: string
  hint?: string
  error?: string
  required?: boolean
  children: ReactNode
}

export function FormField({ label, htmlFor, hint, error, required, children }: FormFieldProps) {
  const messageId = hint || error ? `${htmlFor}-${error ? 'error' : 'hint'}` : undefined
  const control = isValidElement<DescribableControl>(children)
    ? cloneElement(children as ReactElement<DescribableControl>, {
      id: htmlFor,
      required,
      'aria-describedby': messageId,
      'aria-invalid': error ? true : undefined,
    })
    : children
  return <div className="form-field">
    <label className="form-field__label" htmlFor={htmlFor}>{label}{required && <span className="form-field__required">Required</span>}</label>
    {control}
    {error && <span className="form-field__message form-field__message--error" id={messageId}>{error}</span>}
    {!error && hint && <span className="form-field__message" id={messageId}>{hint}</span>}
  </div>
}
