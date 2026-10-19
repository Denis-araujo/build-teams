import type { CSSProperties } from 'react'

const STAR_PATH =
  'M234.29,114.85l-45,38.83L203,211.75a16.4,16.4,0,0,1-24.5,17.82L128,198.49,77.47,229.57A16.4,16.4,0,0,1,53,211.75l13.76-58.07-45-38.83A16.46,16.46,0,0,1,31.08,86l59-4.76,22.76-55.08a16.36,16.36,0,0,1,30.27,0l22.75,55.08,59,4.76a16.46,16.46,0,0,1,9.37,28.86Z'

function Star({ size, empty }: { size: number; empty?: boolean }) {
  return (
    <svg
      viewBox="0 0 256 256"
      width={size}
      height={size}
      aria-hidden="true"
      style={{
        display: 'block',
        color: empty ? 'var(--gold-empty)' : 'var(--gold)',
        filter: empty ? undefined : 'drop-shadow(0 1px 1px var(--gold-shade))',
      }}
    >
      <path fill="currentColor" d={STAR_PATH} />
    </svg>
  )
}

export function formatRating(v: number): string {
  const r = Math.round(v * 10) / 10
  return r.toFixed(Number.isInteger(r) ? 0 : 1).replace('.', ',')
}

export function StarRating(props: {
  value: number
  onChange?: (v: number) => void
  size?: number
}) {
  const { value, onChange, size = 16 } = props
  const label = `${formatRating(value)} ${value === 1 ? 'estrela' : 'estrelas'}`
  return (
    <div
      role={onChange ? 'group' : 'img'}
      aria-label={label}
      style={{ display: 'inline-flex', gap: 1, flex: 'none' }}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = Math.min(1, Math.max(0, value - (n - 1)))
        const half = Math.max(1, n - 0.5)
        return (
          <div key={n} style={{ position: 'relative', width: size, height: size }}>
            <div style={{ position: 'absolute', inset: 0 }}>
              <Star size={size} empty />
            </div>
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: size,
                width: `${fill * 100}%`,
                overflow: 'hidden',
                pointerEvents: 'none',
              }}
            >
              <Star size={size} />
            </div>
            {onChange && (
              <>
                <button
                  type="button"
                  aria-label={`${formatRating(half)} ${half === 1 ? 'estrela' : 'estrelas'}`}
                  className="star-hit"
                  onClick={() => onChange(half)}
                  style={hit('left')}
                />
                <button
                  type="button"
                  aria-label={`${formatRating(n)} ${n === 1 ? 'estrela' : 'estrelas'}`}
                  className="star-hit"
                  onClick={() => onChange(n)}
                  style={hit('right')}
                />
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

function hit(side: 'left' | 'right'): CSSProperties {
  return {
    position: 'absolute',
    [side]: 0,
    top: 0,
    width: '50%',
    height: '100%',
    background: 'transparent',
    border: 0,
    padding: 0,
    cursor: 'pointer',
  }
}
