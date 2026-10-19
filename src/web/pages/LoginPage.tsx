import { useState, type FormEvent } from 'react'
import { api, HttpError, UnauthorizedError } from '../api'

function loginError(e: unknown): string {
  if (e instanceof UnauthorizedError) return 'Senha incorreta'
  if (e instanceof HttpError && e.status === 429) return 'Muitas tentativas. Tente de novo em alguns minutos.'
  if (e instanceof HttpError && e.status === 503) return 'Servidor sem senha configurada'
  return 'Não foi possível entrar. Tente de novo.'
}

export default function LoginPage({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await api.login(password)
      setPassword('')
      onLoggedIn()
    } catch (err) {
      setPassword('')
      setError(loginError(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="flex items-center justify-center px-5 py-12 min-h-[calc(100vh-66px)] box-border">
      <form
        className="w-full max-w-[380px] bg-surface rounded-lg shadow-md p-[28px] flex flex-col gap-[18px] box-border"
        onSubmit={submit}
      >
        <h1 className="m-0 text-[24px] font-medium tracking-[-0.01em]">Administrador</h1>
        <label className="flex flex-col gap-[6px] text-[13px] text-neutral-400">
          Senha
          <input
            className="input w-full box-border bg-bg border border-line text-text"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <p
            className="m-0 text-[13px] px-3 py-2 rounded-sm bg-gold-tint text-gold-ink shadow-[inset_0_0_0_1px_var(--gold-soft)]"
            role="alert"
          >
            {error}
          </p>
        )}
        <button className="btn btn-primary w-full mt-[5.6px] px-4 py-[10px]" type="submit" disabled={submitting}>
          Entrar
        </button>
      </form>
    </div>
  )
}
