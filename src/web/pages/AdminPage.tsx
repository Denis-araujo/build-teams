import { useEffect, useState } from 'react'
import { api } from '../api'
import { PlayersPanel } from '../components/PlayersPanel'
import { DrawArea } from '../components/DrawArea'
import { GameBar } from '../components/GameBar'
import { SettingsToggle } from '../components/SettingsToggle'
import { useAdminData } from '../hooks/useAdminData'
import { SiteHeader } from '../components/SiteHeader'
import LoginPage from './LoginPage'

function AdminFrame({ onLoggedOut }: { onLoggedOut: () => void }) {
  const data = useAdminData()

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
      <SiteHeader roleLabel="Administrador" onLogout={() => void logout()} />
      <main className="flex flex-wrap gap-[28px] px-[28px] pt-[24px] pb-[56px] items-start max-w-[1440px] mx-auto box-border">
        {data.status === 'error' && (
          <p className="form-error" role="alert">
            Não foi possível carregar os dados.{' '}
            <button className="btn btn-ghost" type="button" onClick={() => void data.reload()}>
              Tentar de novo
            </button>
          </p>
        )}
        {data.status === 'ready' && (
          <>
            <GameBar game={data.game} setGame={data.setGame} onUnauthorized={onLoggedOut} />
            <SettingsToggle settings={data.settings} setSettings={data.setSettings} onUnauthorized={onLoggedOut} />
            <section aria-label="Jogadores e sorteio" className="admin-columns">
              <PlayersPanel
                players={data.players}
                game={data.game}
                onPlayersChange={data.setPlayers}
                onGameChange={data.setGame}
                onUnauthorized={onLoggedOut}
                onStale={() => void data.reload()}
              />
              <DrawArea
                game={data.game}
                players={data.players}
                onGameChange={data.setGame}
                onUnauthorized={onLoggedOut}
                onStale={() => void data.reload()}
              />
            </section>
          </>
        )}
      </main>
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
