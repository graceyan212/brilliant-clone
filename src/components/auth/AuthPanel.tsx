import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/AuthProvider'
import './AuthPanel.css'

type Mode = 'sign_in' | 'sign_up'
type Status = { kind: 'error' | 'info'; text: string }

export function AuthPanel() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('sign_in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<Status>()
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setStatus(undefined)

    if (mode === 'sign_in') {
      const { error } = await signIn(email, password)
      if (error) {
        setStatus({ kind: 'error', text: error })
      } else {
        navigate('/')
      }
    } else {
      const { error, needsConfirmation } = await signUp(email, password)
      if (error) {
        setStatus({ kind: 'error', text: error })
      } else if (needsConfirmation) {
        setStatus({
          kind: 'info',
          text: 'Account created. Check your email to confirm, then sign in.',
        })
        setMode('sign_in')
      } else {
        navigate('/')
      }
    }

    setBusy(false)
  }

  function switchMode(next: Mode) {
    setMode(next)
    setStatus(undefined)
  }

  return (
    <section className="auth">
      <h1>{mode === 'sign_in' ? 'Sign in' : 'Create account'}</h1>
      <p className="auth__lead">Save your progress and keep your streak going.</p>

      <form className="auth__form" onSubmit={submit}>
        <label className="auth__field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label className="auth__field">
          <span>Password</span>
          <input
            type="password"
            autoComplete={mode === 'sign_in' ? 'current-password' : 'new-password'}
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {status && (
          <p className={status.kind === 'error' ? 'auth__status is-error' : 'auth__status is-info'}>
            {status.text}
          </p>
        )}

        <button type="submit" className="btn btn--primary auth__submit" disabled={busy}>
          {busy ? 'Working…' : mode === 'sign_in' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <p className="auth__switch">
        {mode === 'sign_in' ? (
          <>
            New here?{' '}
            <button type="button" onClick={() => switchMode('sign_up')}>
              Create an account
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button type="button" onClick={() => switchMode('sign_in')}>
              Sign in
            </button>
          </>
        )}
      </p>

      <Link className="auth__back" to="/">
        Back home
      </Link>
    </section>
  )
}
