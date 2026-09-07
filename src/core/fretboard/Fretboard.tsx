import { useMemo } from 'react'
import { STRING_NUMBERS, STRING_LABELS, type StringNumber } from '../music/tuning'
import {
  DOUBLE_DOT_FRETS,
  SINGLE_DOT_FRETS,
  type FretMarker,
} from './types'

export interface FretboardProps {
  fromFret?: number
  toFret?: number
  markers?: FretMarker[]
  /** Click a position (string + fret, fret 0 = open). */
  onSelect?: (string: StringNumber, fret: number) => void
  showStringLabels?: boolean
  showFretNumbers?: boolean
  height?: number
  className?: string
}

const VARIANT_FILL: Record<NonNullable<FretMarker['variant']>, string> = {
  primary: 'var(--fb-primary)',
  chord: 'var(--fb-chord)',
  ghost: 'transparent',
  muted: 'var(--fb-muted)',
  correct: 'var(--fb-correct)',
  wrong: 'var(--fb-wrong)',
}

/**
 * A horizontal fretboard diagram drawn as SVG. The nut is on the left; strings
 * run left-to-right with string 1 (high e) on top. Frets are evenly spaced
 * rather than scale-accurate — it reads as a diagram, not a photo.
 */
export function Fretboard({
  fromFret = 0,
  toFret = 5,
  markers = [],
  onSelect,
  showStringLabels = true,
  showFretNumbers = true,
  height = 180,
  className,
}: FretboardProps) {
  const padLeft = showStringLabels ? 34 : 12
  const padRight = 12
  const padTop = 14
  const padBottom = showFretNumbers ? 26 : 12
  const width = 620

  const startFret = Math.max(0, fromFret)
  const fretCount = Math.max(1, toFret - startFret)
  const innerW = width - padLeft - padRight
  const innerH = height - padTop - padBottom
  const fretW = innerW / fretCount
  const stringGap = innerH / (STRING_NUMBERS.length - 1)

  const stringY = (s: StringNumber) => padTop + (s - 1) * stringGap
  // x for the centre of a fret cell (fret N is between wire N-1 and wire N).
  const fretCenterX = (fret: number) =>
    padLeft + (fret - startFret - 0.5) * fretW
  const openX = padLeft - 16

  const inlayFrets = useMemo(() => {
    const out: { fret: number; double: boolean }[] = []
    for (let f = startFret + 1; f <= toFret; f++) {
      if (DOUBLE_DOT_FRETS.includes(f)) out.push({ fret: f, double: true })
      else if (SINGLE_DOT_FRETS.includes(f)) out.push({ fret: f, double: false })
    }
    return out
  }, [startFret, toFret])

  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Guitar fretboard diagram"
      style={{ width: '100%', height: 'auto', touchAction: 'manipulation' }}
    >
      {/* fingerboard */}
      <rect
        x={padLeft}
        y={padTop - 6}
        width={innerW}
        height={innerH + 12}
        rx={4}
        fill="var(--fb-board)"
      />

      {/* inlays */}
      {inlayFrets.map(({ fret, double }) =>
        double ? (
          <g key={fret}>
            <circle cx={fretCenterX(fret)} cy={padTop + innerH * 0.28} r={4} fill="var(--fb-inlay)" />
            <circle cx={fretCenterX(fret)} cy={padTop + innerH * 0.72} r={4} fill="var(--fb-inlay)" />
          </g>
        ) : (
          <circle
            key={fret}
            cx={fretCenterX(fret)}
            cy={padTop + innerH / 2}
            r={4}
            fill="var(--fb-inlay)"
          />
        ),
      )}

      {/* fret wires */}
      {Array.from({ length: fretCount + 1 }, (_, i) => {
        const f = startFret + i
        const x = padLeft + i * fretW
        const isNut = f === 0
        return (
          <line
            key={f}
            x1={x}
            y1={padTop - 6}
            x2={x}
            y2={padTop + innerH + 6}
            stroke={isNut ? 'var(--fb-nut)' : 'var(--fb-wire)'}
            strokeWidth={isNut ? 6 : 2}
            strokeLinecap="round"
          />
        )
      })}

      {/* strings */}
      {STRING_NUMBERS.map((s) => (
        <line
          key={s}
          x1={padLeft}
          y1={stringY(s)}
          x2={padLeft + innerW}
          y2={stringY(s)}
          stroke="var(--fb-string)"
          strokeWidth={0.6 + (s - 1) * 0.5}
        />
      ))}

      {/* string labels */}
      {showStringLabels &&
        STRING_NUMBERS.map((s) => (
          <text
            key={s}
            x={12}
            y={stringY(s) + 4}
            fontSize={12}
            fill="var(--fb-label)"
            fontFamily="ui-monospace, monospace"
          >
            {STRING_LABELS[s]}
          </text>
        ))}

      {/* fret numbers */}
      {showFretNumbers &&
        Array.from({ length: fretCount }, (_, i) => {
          const f = startFret + i + 1
          return (
            <text
              key={f}
              x={fretCenterX(f)}
              y={height - 8}
              fontSize={11}
              textAnchor="middle"
              fill="var(--fb-label)"
            >
              {f}
            </text>
          )
        })}

      {/* click targets */}
      {onSelect &&
        STRING_NUMBERS.map((s) =>
          Array.from({ length: fretCount + 1 }, (_, i) => {
            const fret = startFret + i
            const cx = fret === 0 ? openX : fretCenterX(fret)
            return (
              <circle
                key={`${s}-${fret}`}
                cx={cx}
                cy={stringY(s)}
                r={Math.min(fretW, stringGap) / 2}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onClick={() => onSelect(s, fret)}
              />
            )
          }),
        )}

      {/* markers */}
      {markers.map((m, i) => {
        const cx = m.fret === 0 ? openX : fretCenterX(m.fret)
        const cy = stringY(m.string)
        const variant = m.variant ?? 'primary'
        return (
          <g key={`${m.string}-${m.fret}-${i}`} pointerEvents="none">
            <circle
              cx={cx}
              cy={cy}
              r={11}
              fill={VARIANT_FILL[variant]}
              stroke={
                variant === 'ghost' ? 'var(--fb-ghost-stroke)' : 'var(--fb-marker-stroke)'
              }
              strokeWidth={variant === 'ghost' ? 1.5 : 1}
              strokeDasharray={variant === 'ghost' ? '3 2' : undefined}
            />
            {m.label && (
              <text
                x={cx}
                y={cy + 3.5}
                fontSize={10}
                textAnchor="middle"
                fill={variant === 'ghost' ? 'var(--fb-ghost-stroke)' : 'var(--fb-marker-text)'}
                fontFamily="ui-monospace, monospace"
              >
                {m.label}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
