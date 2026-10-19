import { useEffect, useRef, useState } from 'react'
import type { Player } from '../../shared/types'
import { buildWhatsAppText } from '../../shared/whatsapp'

type Props = { date: string; teams: Player[][]; reserves: Player[] }

export function CopyBar({ date, teams, reserves }: Props) {
  const [includeStars, setIncludeStars] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showFallback, setShowFallback] = useState(false)
  const mounted = useRef(true)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  const text = () => buildWhatsAppText({ date, teams, reserves, includeStars })

  async function copy() {
    const value = text()
    try {
      if (!navigator.clipboard) throw new Error('sem área de transferência')
      await navigator.clipboard.writeText(value)
      if (!mounted.current) return
      setShowFallback(false)
      setCopied(true)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      if (!mounted.current) return
      setCopied(false)
      setShowFallback(true)
    }
  }

  return (
    <div className="copy-bar">
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
        <button type="button" className="btn btn-primary" onClick={() => void copy()}>
          {copied ? 'Copiado ✓' : 'Copiar escalação'}
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={includeStars}
            onChange={(e) => {
              setIncludeStars(e.target.checked)
            }}
          />
          Incluir estrelas
        </label>
      </div>
      {showFallback && (
        <>
          <textarea
            readOnly
            className="copy-fallback"
            rows={Math.min(14, text().split('\n').length + 1)}
            value={text()}
            onFocus={(e) => e.currentTarget.select()}
          />
          <span style={{ fontSize: 13, color: 'var(--color-neutral-400)' }}>Copie o texto acima manualmente</span>
        </>
      )}
    </div>
  )
}
