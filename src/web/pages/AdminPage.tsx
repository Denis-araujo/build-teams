import { useEffect, useState } from 'react'
import { api, HttpError, UnauthorizedError } from '../api'
import { PlayersPanel } from '../components/PlayersPanel'
import { DrawArea } from '../components/DrawArea'
import { SaveBar } from '../components/SaveBar'
import { GameBar } from '../components/GameBar'
import { SettingsToggle } from '../components/SettingsToggle'
import { useAdminData } from '../hooks/useAdminData'
import { SiteHeader } from '../components/SiteHeader'
import { formatDayLabel } from '../format'
import LoginPage from './LoginPage'

function AdminFrame({ onLoggedOut }: { onLoggedOut: () => void }) {
  const data = useAdminData()
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const { dirty, save, discard, reload } = data

  // Edições não salvas só existem nesta aba: avisa antes de fechar ou recarregar.
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  async function onSave() {
    if (saving) return
    setSaving(true)
    setSaveError(null)
    try {
      await save()
    } catch (e) {
      if (e instanceof UnauthorizedError) onLoggedOut()
      else if (e instanceof HttpError && e.status === 404) {
        void reload()
        setSaveError('O jogo mudou. A página foi atualizada.')
      } else setSaveError(e instanceof HttpError && e.serverMessage ? e.serverMessage : 'Não foi possível salvar. Tente de novo.')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (data.status === 'unauthorized') onLoggedOut()
  }, [data.status, onLoggedOut])

  async function logout() {
    try {
      await api.logout()
    } catch {
      // mesmo se falhar, volta ao login; a sessão expira sozinha
    }
    onLoggedOut()
  }

  return (
    <>
      <SiteHeader
        roleLabel="Administrador"
        subtitle={
          data.status === 'ready'
            ? data.game
              ? formatDayLabel(data.game.date, data.game.time)
              : 'Sem jogo marcado'
            : undefined
        }
        onLogout={() => void logout()}
      />
      <main className="flex flex-wrap gap-[28px] px-[28px] pt-[24px] pb-[56px] items-start max-w-[1440px] mx-auto box-border">
        {/* Carregando ou com erro ainda não há coluna "Times": o h1 único da tela fica só para leitores de tela. */}
        {(data.status === 'loading' || data.status === 'error') && <h1 className="sr-only">Times</h1>}
        {data.status === 'error' && (
          <p className="px-3 py-2 rounded-sm bg-gold-tint text-gold-ink shadow-[inset_0_0_0_1px_var(--gold-soft)]" role="alert">
            Não foi possível carregar os dados.{' '}
            <button className="btn btn-ghost" type="button" onClick={() => void data.reload()}>
              Tentar de novo
            </button>
          </p>
        )}
        {data.status === 'ready' && (
          <>
            {/* display:contents: o aside "Elenco" e a coluna "Times" são filhos diretos do <main>, como no v4. */}
            <section aria-label="Jogadores e sorteio" className="contents">
              <PlayersPanel
                players={data.players}
                game={data.game}
                onPlayersChange={data.setPlayers}
                onGameChange={data.editGame}
                onUnauthorized={onLoggedOut}
                externalBusy={saving}
                footer={
                  <SettingsToggle settings={data.settings} setSettings={data.setSettings} onUnauthorized={onLoggedOut} />
                }
              />
              <DrawArea
                gameCard={<GameBar game={data.game} setGame={data.setGame} onUnauthorized={onLoggedOut} />}
                game={data.game}
                players={data.players}
                onGameChange={data.editGame}
                externalBusy={saving}
              />
            </section>
          </>
        )}
      </main>
      {data.status === 'ready' && dirty && (
        <SaveBar
          saving={saving}
          error={saveError}
          onSave={() => void onSave()}
          onDiscard={() => {
            setSaveError(null)
            discard()
          }}
        />
      )}
    </>
  )
}

export default function AdminPage() {
  const [auth, setAuth] = useState<'checking' | 'out' | 'in'>('checking')

  useEffect(() => {
    let active = true
    api
      .me()
      .then((ok) => active && setAuth(ok ? 'in' : 'out'))
      .catch(() => active && setAuth('out'))
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="min-h-screen text-text bg-bg">
      {auth === 'checking' && null}
      {auth === 'out' && (
        <>
          <SiteHeader roleLabel="Acesso restrito" />
          <LoginPage onLoggedIn={() => setAuth('in')} />
        </>
      )}
      {auth === 'in' && <AdminFrame onLoggedOut={() => setAuth('out')} />}
    </div>
  )
}
