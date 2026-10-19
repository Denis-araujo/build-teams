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
    <section
      className="flex flex-col gap-2 border-t border-neutral-900 px-[18px] py-3 text-[13px]"
      aria-label="Configurações"
    >
      <label className="flex items-center justify-between gap-[10px] cursor-pointer">
        Membro vê as estrelas
        <input
          type="checkbox"
          className="size-4 accent-[var(--navy)] cursor-pointer m-0 flex-none disabled:cursor-not-allowed"
          checked={settings?.memberSeesStars ?? false}
          disabled={!settings || busy}
          onChange={(e) => void toggle(e.target.checked)}
        />
      </label>
      {error && (
        <p className="m-0 px-3 py-2 rounded-sm bg-gold-tint text-gold-ink shadow-[inset_0_0_0_1px_var(--gold-soft)]" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
