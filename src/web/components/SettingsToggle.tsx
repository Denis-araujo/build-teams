import { useState } from 'react'
import { api, UnauthorizedError, type Settings } from '../api'

type Props = {
  settings: Settings | null
  setSettings: (s: Settings) => void
  onUnauthorized: () => void
}

export function SettingsToggle({ settings, setSettings, onUnauthorized }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function toggle(next: boolean) {
    const previous = settings
    if (!previous) return
    setError(null)
    setBusy(true)
    setSettings({ ...previous, memberSeesStars: next })
    try {
      setSettings(await api.setMemberSeesStars(next))
    } catch (e) {
      setSettings(previous)
      if (e instanceof UnauthorizedError) onUnauthorized()
      else setError('Não foi possível salvar a configuração. Tente de novo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="admin-card" aria-label="Configurações">
      <label className="switch">
        <input
          type="checkbox"
          checked={settings?.memberSeesStars ?? false}
          disabled={!settings || busy}
          onChange={(e) => void toggle(e.target.checked)}
        />
        Membro vê as estrelas
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
