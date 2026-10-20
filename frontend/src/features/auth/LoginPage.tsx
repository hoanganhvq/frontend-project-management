import { useState, type FormEvent, type MouseEvent, type ReactNode } from 'react'
import { useAuth } from '../../app/AuthProvider'
import { ApiError } from '../../api/client'
import type { LoginRequest, RegisterRequest } from '../../api/models'
import { Button } from '../../components/ui/Button'
import { FormField } from '../../components/ui/FormField'
import { Input } from '../../components/ui/Input'
import { navigate, safeRedirectPath } from '../../app/router'
import './LoginPage.css'

type AuthErrors = Partial<Record<'name' | 'email' | 'password', string>>

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function redirectQuery(): string {
  const redirect = safeRedirectPath(new URLSearchParams(window.location.search).get('redirect'))
  return redirect
    ? `?redirect=${encodeURIComponent(redirect)}`
    : ''
}

function validateCredentials(email: string, password: string): AuthErrors {
  const errors: AuthErrors = {}
  const normalizedEmail = email.trim()
  if (!normalizedEmail) errors.email = 'Enter your email address.'
  else if (!validEmail(normalizedEmail)) errors.email = 'Enter a valid email address.'
  else if (normalizedEmail.length > 150) errors.email = 'Email address must be 150 characters or fewer.'
  if (!password.trim()) errors.password = 'Enter your password.'
  else if (password.length < 8) errors.password = 'Password must be at least 8 characters.'
  return errors
}

function loginError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) return 'Email or password is incorrect. Check your details and try again.'
    if (error.status === 400) return 'Check your email and password, then try again.'
    if (error.status >= 500) return 'The sign-in service could not complete your request. Please try again shortly.'
  }
  return 'We could not connect to the sign-in service. Check your connection and try again.'
}

function registerError(error: unknown): string {
  if (error instanceof ApiError) {
    const message = `${error.message} ${String(error.details ?? '')}`.toLowerCase()
    if (error.status === 400 || error.status === 409) {
      if (message.includes('email_exists') || message.includes('email already exists')) {
        return 'An account with this email already exists. Sign in or use another email address.'
      }
      return 'Check the name, email address, and password and try again.'
    }
    if (error.status >= 500) return 'The sign-up service could not complete your request. Please try again shortly.'
  }
  return 'We could not connect to the sign-up service. Check your connection and try again.'
}

function AuthLink({ href, className, ariaLabel, children }: {
  href: string
  className?: string
  ariaLabel?: string
  children: ReactNode
}) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    navigate(href)
  }

  return <a href={href} className={className} aria-label={ariaLabel} onClick={handleClick}>{children}</a>
}

function Brand() {
  return <AuthLink className="auth-brand" href="/login" ariaLabel="Orbit AI workspace home">
    <span className="auth-brand__mark" aria-hidden="true">O</span>
    <span>Orbit<span>AI</span></span>
  </AuthLink>
}

function WorkspacePanel() {
  return <aside className="auth-card__visual" aria-label="Project planning workspace preview">
    <div className="auth-visual__content">
      <span className="auth-visual__badge"><span aria-hidden="true" /> PROJECT WORKSPACE</span>
      <h2>Make the next step clear.</h2>
      <p>Bring project plans, tasks, and team progress together in one calm workspace.</p>
      <div className="auth-visual__preview" aria-hidden="true">
        <div className="auth-preview__header"><span className="auth-preview__dot" /><span>Product launch</span><span className="auth-preview__date">This quarter</span></div>
        <div className="auth-preview__row"><span>Requirements</span><span className="auth-preview__track"><i className="auth-preview__bar auth-preview__bar--violet" /></span></div>
        <div className="auth-preview__row"><span>Design</span><span className="auth-preview__track"><i className="auth-preview__bar auth-preview__bar--blue" /></span></div>
        <div className="auth-preview__row"><span>Development</span><span className="auth-preview__track"><i className="auth-preview__bar auth-preview__bar--green" /></span></div>
        <div className="auth-preview__row"><span>Review</span><span className="auth-preview__track"><i className="auth-preview__bar auth-preview__bar--gold" /></span></div>
        <div className="auth-preview__legend"><span><i className="auth-preview__legend-dot auth-preview__legend-dot--violet" />Planned</span><span><i className="auth-preview__legend-dot auth-preview__legend-dot--green" />On track</span></div>
      </div>
      <p className="auth-visual__caption">A shared view from idea to delivery.</p>
    </div>
  </aside>
}

function AuthLayout({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <main className="auth-screen">
    <section className="auth-card" aria-label={title}>
      <div className="auth-card__form-panel">
        <Brand />
        <div className="auth-heading">
          <p className="auth-eyebrow">PROJECT MANAGEMENT WORKSPACE</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {children}
        <p className="auth-secure-note"><span aria-hidden="true">●</span> Your sign-in is protected by a secure, HttpOnly session cookie.</p>
      </div>
      <WorkspacePanel />
    </section>
    <footer className="auth-footer">© {new Date().getFullYear()} Orbit AI <span aria-hidden="true">·</span> Project management workspace</footer>
  </main>
}

function FormMessage({ error, success }: { error: string; success?: string }) {
  return <div className={`auth-message-slot${error ? ' auth-message-slot--error' : ''}`} aria-live="polite" aria-atomic="true">
    {error && <p className="auth-message auth-message--error" role="alert"><span aria-hidden="true">!</span>{error}</p>}
    {!error && success && <p className="auth-message auth-message--success" role="status">{success}</p>}
  </div>
}

function PasswordField({
  id,
  value,
  onChange,
  error,
  autoComplete,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  error?: string
  autoComplete: 'current-password' | 'new-password'
}) {
  const [visible, setVisible] = useState(false)
  return <FormField label="Password" htmlFor={id} hint="At least 8 characters." error={error} required>
    <div className="auth-password-control">
      <Input id={id} name="password" type={visible ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} required minLength={8} />
      <Button className="auth-password-toggle" variant="ghost" size="sm" type="button" aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} onClick={() => setVisible((current) => !current)}>{visible ? 'Hide' : 'Show'}</Button>
    </div>
  </FormField>
}

export function LoginPage() {
  const { login, registrationSucceeded, clearRegistrationNotice } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<AuthErrors>({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors = validateCredentials(email, password)
    setFieldErrors(errors)
    setError('')
    clearRegistrationNotice()
    if (Object.keys(errors).length) return

    setSubmitting(true)
    try {
      const credentials: LoginRequest = { email: email.trim(), password }
      await login(credentials)
    } catch (requestError) {
      setError(loginError(requestError))
    } finally {
      setSubmitting(false)
    }
  }

  return <AuthLayout title="Welcome back" description="Sign in to continue planning and managing your projects.">
    <form className="auth-form" noValidate onSubmit={(event) => void submit(event)}>
      <FormField label="Email address" htmlFor="login-email" hint="Use the email address on your account." error={fieldErrors.email} required>
        <Input id="login-email" name="email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setFieldErrors((current) => ({ ...current, email: undefined })); setError('') }} autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={150} />
      </FormField>
      <PasswordField id="login-password" value={password} onChange={(value) => { setPassword(value); setFieldErrors((current) => ({ ...current, password: undefined })); setError('') }} error={fieldErrors.password} autoComplete="current-password" />
      <FormMessage error={error} success={registrationSucceeded ? 'Your account was created. Sign in to open your workspace.' : undefined} />
      <Button className="auth-submit" variant="primary" type="submit" disabled={submitting}>
        {submitting ? <><span className="auth-spinner" aria-hidden="true" />Signing in…</> : 'Sign in'}
      </Button>
    </form>
    <p className="auth-switch">New to Orbit AI? <AuthLink href={`/register${redirectQuery()}`}>Create an account</AuthLink></p>
  </AuthLayout>
}

export function RegisterPage() {
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<AuthErrors>({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors = validateCredentials(email, password)
    const normalizedName = name.trim()
    if (!normalizedName) errors.name = 'Enter your name.'
    else if (normalizedName.length > 100) errors.name = 'Name must be 100 characters or fewer.'
    setFieldErrors(errors)
    setError('')
    if (Object.keys(errors).length) return

    setSubmitting(true)
    try {
      const details: RegisterRequest = { name: normalizedName, email: email.trim(), password }
      await register(details)
      navigate(`/login${redirectQuery()}`, { replace: true })
    } catch (requestError) {
      setError(registerError(requestError))
    } finally {
      setSubmitting(false)
    }
  }

  return <AuthLayout title="Create your account" description="Set up your workspace and start organizing project work.">
    <form className="auth-form auth-form--register" noValidate onSubmit={(event) => void submit(event)}>
      <FormField label="Full name" htmlFor="register-name" hint="This name will appear in your workspace." error={fieldErrors.name} required>
        <Input id="register-name" name="name" type="text" value={name} onChange={(event) => { setName(event.target.value); setFieldErrors((current) => ({ ...current, name: undefined })); setError('') }} autoComplete="name" required maxLength={100} />
      </FormField>
      <FormField label="Email address" htmlFor="register-email" hint="Use an email address you can access." error={fieldErrors.email} required>
        <Input id="register-email" name="email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setFieldErrors((current) => ({ ...current, email: undefined })); setError('') }} autoComplete="email" autoCapitalize="none" spellCheck={false} required maxLength={150} />
      </FormField>
      <PasswordField id="register-password" value={password} onChange={(value) => { setPassword(value); setFieldErrors((current) => ({ ...current, password: undefined })); setError('') }} error={fieldErrors.password} autoComplete="new-password" />
      <FormMessage error={error} />
      <Button className="auth-submit" variant="primary" type="submit" disabled={submitting}>
        {submitting ? <><span className="auth-spinner" aria-hidden="true" />Creating account…</> : 'Create account'}
      </Button>
    </form>
    <p className="auth-switch">Already have an account? <AuthLink href={`/login${redirectQuery()}`}>Sign in</AuthLink></p>
  </AuthLayout>
}

export function AuthLoadingPage({ message = 'Checking your session…' }: { message?: string }) {
  return <main className="auth-screen auth-screen--loading"><div className="auth-loading-card"><span className="auth-brand__mark" aria-hidden="true">O</span><span className="auth-spinner" aria-hidden="true" />{message}</div></main>
}

export function AuthUnavailablePage({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <main className="auth-screen auth-screen--loading"><section className="auth-unavailable" role="alert"><span className="auth-brand__mark" aria-hidden="true">O</span><h1>Can’t reach the sign-in service</h1><p>{message}</p><Button variant="primary" onClick={onRetry}>Try again</Button></section></main>
}
