const STAR_PATH =
  'M234.29,114.85l-45,38.83L203,211.75a16.4,16.4,0,0,1-24.5,17.82L128,198.49,77.47,229.57A16.4,16.4,0,0,1,53,211.75l13.76-58.07-45-38.83A16.46,16.46,0,0,1,31.08,86l59-4.76,22.76-55.08a16.36,16.36,0,0,1,30.27,0l22.75,55.08,59,4.76a16.46,16.46,0,0,1,9.37,28.86Z'

// Tailwind só gera classes escritas literalmente: tamanhos via tabela, nunca por template string.
const SIZES: Record<number, { box: string; layer: string; svg: string }> = {
  11: { box: 'size-[11px]', layer: 'h-[11px]', svg: 'size-[11px]' },
  12: { box: 'size-[12px]', layer: 'h-[12px]', svg: 'size-[12px]' },
  14: { box: 'size-[14px]', layer: 'h-[14px]', svg: 'size-[14px]' },
  15: { box: 'size-[15px]', layer: 'h-[15px]', svg: 'size-[15px]' },
  16: { box: 'size-[16px]', layer: 'h-[16px]', svg: 'size-[16px]' },
  18: { box: 'size-[18px]', layer: 'h-[18px]', svg: 'size-[18px]' },
  20: { box: 'size-[20px]', layer: 'h-[20px]', svg: 'size-[20px]' },
  22: { box: 'size-[22px]', layer: 'h-[22px]', svg: 'size-[22px]' },
  24: { box: 'size-[24px]', layer: 'h-[24px]', svg: 'size-[24px]' },
}

function Star({
  size,
  className,
  shadow,
}: {
  size: number
  className: string
  shadow?: boolean
}) {
  return (
    <svg
      viewBox="0 0 256 256"
      width={size}
      height={size}
      aria-hidden="true"
      className={className + (shadow ? ' drop-shadow-[0_1px_1px_var(--gold-shade)]' : '')}
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
  const dim = SIZES[size] ?? SIZES[16]
  const px = SIZES[size] ? size : 16
  const label = `${formatRating(value)} ${value === 1 ? 'estrela' : 'estrelas'}`
  // v4: gap 2px no formulário (22px), 1px nos demais; drop-shadow só na versão editável.
  const gap = size === 22 ? 'gap-0.5' : 'gap-px'
  return (
    <div
      role={onChange ? 'group' : 'img'}
      aria-label={label}
      className={`inline-flex flex-none ${gap}`}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = Math.min(1, Math.max(0, value - (n - 1)))
        const half = n - 0.5
        return (
          <div key={n} className={`relative ${dim.box}`}>
            <Star size={px} className={`absolute inset-0 text-gold-empty ${dim.svg}`} />
            <div
              className={`absolute top-0 left-0 overflow-hidden pointer-events-none ${dim.layer}`}
              style={{ width: `${fill * 100}%` }}
            >
              <Star size={px} className={`block text-gold ${dim.svg}`} shadow={!!onChange} />
            </div>
            {onChange && (
              <>
                <button
                  type="button"
                  aria-label={`${formatRating(half)} ${half === 1 ? 'estrela' : 'estrelas'}`}
                  className={HIT + ' left-0'}
                  onClick={() => onChange(half)}
                />
                <button
                  type="button"
                  aria-label={`${formatRating(n)} ${n === 1 ? 'estrela' : 'estrelas'}`}
                  className={HIT + ' right-0'}
                  onClick={() => onChange(n)}
                />
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

// star-hit: marcador mantido (teste). Foco visível por utilitários.
const HIT =
  'star-hit absolute top-0 w-1/2 h-full bg-transparent border-0 p-0 cursor-pointer rounded-[3px] focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1 focus-visible:z-10'
