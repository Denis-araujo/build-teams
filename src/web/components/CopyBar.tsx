import { useEffect, useRef, useState } from 'react'
import type { Player } from '../../shared/types'
import { buildWhatsAppText } from '../../shared/whatsapp'

const COPY_ICON =
  'M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208V208Z'

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
    <div className="flex flex-col gap-3 rounded-lg bg-navy px-[18px] py-4 text-navy-ink">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[15px] font-medium">Mandar no grupo</span>
          <span className="text-[13px] text-navy-muted">Copia a escalação pronta para colar no WhatsApp.</span>
        </div>
        <div className="flex flex-wrap items-center gap-[14px]">
          <label className="flex cursor-pointer items-center gap-[6px] text-[13px] text-navy-ink">
            <input
              type="checkbox"
              className="m-0 size-4 accent-gold"
              checked={includeStars}
              onChange={(e) => {
                setIncludeStars(e.target.checked)
              }}
            />
            Incluir estrelas
          </label>
          <button
            type="button"
            className="flex cursor-pointer items-center gap-2 rounded-md border-0 bg-gold px-4 py-[9px] text-[14px] font-medium text-ink-on-gold hover:bg-gold-soft"
            onClick={() => void copy()}
          >
            <svg viewBox="0 0 256 256" width="15" height="15" aria-hidden="true">
              <path fill="currentColor" d={COPY_ICON} />
            </svg>
            {copied ? 'Copiado ✓' : 'Copiar escalação'}
          </button>
        </div>
      </div>
      {showFallback && (
        <>
          <textarea
            readOnly
            className="rounded-sm border-0 bg-surface p-[10px] font-[inherit] text-[13px] text-text"
            rows={Math.min(14, text().split('\n').length + 1)}
            value={text()}
            onFocus={(e) => e.currentTarget.select()}
          />
          <span className="text-[13px] text-navy-muted">Copie o texto acima manualmente</span>
        </>
      )}
    </div>
  )
}
