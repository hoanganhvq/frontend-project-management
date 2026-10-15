import { useState, type FormEvent } from 'react'
import { useAuth } from '../../app/AuthProvider'
import { ApiError } from '../../api/client'
import { Button } from '../../components/ui/Button'
import { FormField } from '../../components/ui/FormField'
import { Input } from '../../components/ui/Input'
import './LoginPage.css'

function loginError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) return 'Email or password is incorrect. Check your details and try again.'
    if (error.status >= 500) return 'The server could not sign you in right now. Please try again shortly.'
  }
  return error instanceof Error ? error.message : 'Sign in failed. Please try again.'
}

export function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login({ email: email.trim(), password })
    } catch (requestError) {
      setError(loginError(requestError))
    } finally {
      setSubmitting(false)
    }
  }

  return <main className="auth-screen">
    <section className="auth-card" aria-labelledby="login-title">
      <div className="auth-card__form-panel">
        <a className="auth-brand" href="/login" aria-label="Orbit AI sign in"><span className="auth-brand__mark" aria-hidden="true">O</span><span>Orbit<span>AI</span></span></a>
        <div className="auth-heading">
          <p className="auth-eyebrow">PROJECT MANAGEMENT WORKSPACE</p>
          <h1 id="login-title">Welcome back</h1>
          <p>Sign in to continue planning and managing your projects.</p>
        </div>
        <form className="auth-form" onSubmit={(event) => void submit(event)}>
          <FormField label="Email address" htmlFor="login-email" required>
            <Input id="login-email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={150} autoFocus />
          </FormField>
          <FormField label="Password" htmlFor="login-password" required>
            <Input id="login-password" name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required minLength={8} maxLength={200} />
          </FormField>
          {error && <div className="auth-error" role="alert"><span aria-hidden="true">!</span><p>{error}</p></div>}
          <Button className="auth-submit" variant="primary" type="submit" disabled={submitting || !email.trim() || !password}>
            {submitting ? <><span className="auth-spinner" aria-hidden="true" />Signing in…</> : 'Sign in'}
          </Button>
        </form>
        <p className="auth-secure-note"><span aria-hidden="true">●</span> Your account is protected with secure sign-in.</p>
      </div>
      <aside className="auth-card__visual" aria-label="Project planning overview">
        <div className="auth-visual__orb auth-visual__orb--one" />
        <div className="auth-visual__orb auth-visual__orb--two" />
        <div className="auth-visual__content">
          <span className="auth-visual__badge"><span /> AI PROJECT PLANNING</span>
          <h2>Turn requirements into a plan your team can deliver.</h2>
          <p>Keep project schedules, tasks, and your team aligned in one workspace.</p>
          <div className="auth-visual__preview" aria-hidden="true">
            <div className="auth-preview__top"><span /><span /><span /><i>Project roadmap</i><b>•••</b></div>
            <div className="auth-preview__body">
              <div className="auth-preview__labels"><span>Requirements</span><span>Design</span><span>Development</span><span>Review</span></div>
              <div className="auth-preview__grid">
                <i className="auth-bar auth-bar--purple" /><i className="auth-bar auth-bar--blue" /><i className="auth-bar auth-bar--green" />
                <i className="auth-bar auth-bar--blue auth-bar--short" /><i className="auth-bar auth-bar--purple auth-bar--mid" /><i className="auth-bar auth-bar--green auth-bar--mid" />
                <i className="auth-bar auth-bar--amber auth-bar--mid" /><i className="auth-bar auth-bar--blue auth-bar--short" />
              </div>
            </div>
          </div>
          <div className="auth-visual__footer"><span className="auth-visual__avatars"><i>AL</i><i>MK</i><i>JT</i></span><span>One plan. Shared progress.</span></div>
        </div>
      </aside>
    </section>
    <footer className="auth-footer">© {new Date().getFullYear()} Orbit AI <span>·</span> Project management workspace</footer>
  </main>
}

export function AuthLoadingPage({ message = 'Checking your session…' }: { message?: string }) {
  return <main className="auth-screen auth-screen--loading"><div className="auth-loading-card"><span className="auth-brand__mark">O</span><span className="auth-spinner" aria-hidden="true" />{message}</div></main>
}

export function AuthUnavailablePage({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <main className="auth-screen auth-screen--loading"><section className="auth-unavailable" role="alert"><span className="auth-brand__mark">O</span><h1>Can’t reach the sign-in service</h1><p>{message}</p><Button variant="primary" onClick={onRetry}>Try again</Button></section></main>
}
