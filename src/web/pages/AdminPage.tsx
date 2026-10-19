import { useEffect, useState } from 'react'
import { api } from '../api'
import { PlayersPanel } from '../components/PlayersPanel'
import { GameBar } from '../components/GameBar'
import { SettingsToggle } from '../components/SettingsToggle'
import { useAdminData } from '../hooks/useAdminData'
import LoginPage from './LoginPage'

function Nav({ onLogout }: { onLogout?: () => void }) {
  return (
    <nav className="nav">
      <div className="nav-brand">
        <svg viewBox="0 0 256 256" width="20" height="20" aria-hidden="true" style={{ color: 'var(--gold)', filter: 'drop-shadow(0 0 6px var(--gold-soft))' }}>
          <path
            fill="currentColor"
            d="M234.29,114.85l-45,38.83L203,211.75a16.4,16.4,0,0,1-24.5,17.82L128,198.49,77.47,229.57A16.4,16.4,0,0,1,53,211.75l13.76-58.07-45-38.83A16.46,16.46,0,0,1,31.08,86l59-4.76,22.76-55.08a16.36,16.36,0,0,1,30.27,0l22.75,55.08,59,4.76a16.46,16.46,0,0,1,9.37,28.86Z"
          />
        </svg>
        <span>Escalação</span>
      </div>
      {onLogout && (
        <button className="btn btn-ghost" type="button" onClick={onLogout}>
          Sair
        </button>
      )}
    </nav>
  )
}

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
      <Nav onLogout={() => void logout()} />
      <main className="admin-main">
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
              />
              {/* A Task 16 acrescenta a área de times ao lado do painel. */}
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
    <div className="page">
      {auth === 'checking' && null}
      {auth === 'out' && (
        <>
          <Nav />
          <LoginPage onLoggedIn={() => setAuth('in')} />
        </>
      )}
      {auth === 'in' && <AdminFrame onLoggedOut={() => setAuth('out')} />}
    </div>
  )
}
