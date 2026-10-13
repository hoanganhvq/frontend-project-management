import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  icon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = 'secondary', size = 'md', icon, className = '', children, type = 'button', ...props }, ref) {
  return <button ref={ref} type={type} className={`button button--${variant} button--${size} ${className}`.trim()} {...props}>{icon}{children}</button>
})
