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
  /** Portrait layout: nut on top, low E on the left, high e on the right —
   *  the way a printed chord box is drawn — instead of the default
   *  landscape layout (nut on the left, high e on top). */
  vertical?: boolean
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
 * A fretboard diagram drawn as SVG, landscape (nut on the left, string 1 /
 * high e on top) or portrait (nut on top, string 1 on the right — a printed
 * chord-box). Frets are evenly spaced rather than scale-accurate — it reads
 * as a diagram, not a photo.
 *
 * Internally everything is laid out on two logical axes rather than raw x/y:
 * "along" the neck (0 = nut, increasing with fret) and "across" the strings
 * (0 = string 1, increasing towards string 6). `xy()` is the only place that
 * decides which axis is screen-x and which is screen-y, and — for
 * "across" — whether it's mirrored so string 6 lands on the left in
 * portrait mode, matching how a chord box is conventionally drawn. Every
 * other calculation below is orientation-agnostic.
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
  vertical = false,
}: FretboardProps) {
  const alongPadStart = showStringLabels ? 34 : 12
  const alongPadEnd = 12
  const acrossPadStart = 14
  const acrossPadEnd = showFretNumbers ? 26 : 12

  const alongExtent = 620
  const acrossExtent = height

  const alongInner = alongExtent - alongPadStart - alongPadEnd
  const acrossInner = acrossExtent - acrossPadStart - acrossPadEnd

  const startFret = Math.max(0, fromFret)
  const fretCount = Math.max(1, toFret - startFret)
  const fretSize = alongInner / fretCount
  const stringGap = acrossInner / (STRING_NUMBERS.length - 1)

  // raw (unmirrored) across-axis position: 0 for string 1 .. acrossInner for string 6
  const acrossRaw = (s: StringNumber) => (s - 1) * stringGap
  const acrossPos = (s: StringNumber) =>
    acrossPadStart + (vertical ? acrossInner - acrossRaw(s) : acrossRaw(s))

  const alongPos = (fret: number) => alongPadStart + (fret - startFret) * fretSize
  // centre of a fret CELL (fret N sits between wires N-1 and N)
  const alongCenter = (fret: number) => alongPadStart + (fret - startFret - 0.5) * fretSize
  const openAlong = alongPadStart - 16

  const xy = (along: number, across: number) =>
    vertical ? { x: across, y: along } : { x: along, y: across }

  const rectFromCorners = (alongA: number, acrossA: number, alongB: number, acrossB: number) => {
    const a = xy(alongA, acrossA)
    const b = xy(alongB, acrossB)
    return {
      x: Math.min(a.x, b.x),
      y: Math.min(a.y, b.y),
      width: Math.abs(b.x - a.x),
      height: Math.abs(b.y - a.y),
    }
  }

  const svgWidth = vertical ? acrossExtent : alongExtent
  const svgHeight = vertical ? alongExtent : acrossExtent

  const inlayFrets = useMemo(() => {
    const out: { fret: number; double: boolean }[] = []
    for (let f = startFret + 1; f <= toFret; f++) {
      if (DOUBLE_DOT_FRETS.includes(f)) out.push({ fret: f, double: true })
      else if (SINGLE_DOT_FRETS.includes(f)) out.push({ fret: f, double: false })
    }
    return out
  }, [startFret, toFret])

  const board = rectFromCorners(
    alongPadStart,
    acrossPadStart - 6,
    alongPadStart + alongInner,
    acrossPadStart + acrossInner + 6,
  )

  return (
    <svg
      className={className}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      role="img"
      aria-label="Guitar fretboard diagram"
      style={{ width: '100%', height: 'auto', touchAction: 'manipulation' }}
    >
      {/* fingerboard */}
      <rect x={board.x} y={board.y} width={board.width} height={board.height} rx={4} fill="var(--fb-board)" />

      {/* inlays */}
      {inlayFrets.map(({ fret, double }) => {
        const p1 = xy(alongCenter(fret), acrossPadStart + acrossInner * 0.28)
        const p2 = xy(alongCenter(fret), acrossPadStart + acrossInner * 0.72)
        const pMid = xy(alongCenter(fret), acrossPadStart + acrossInner / 2)
        return double ? (
          <g key={fret}>
            <circle cx={p1.x} cy={p1.y} r={4} fill="var(--fb-inlay)" />
            <circle cx={p2.x} cy={p2.y} r={4} fill="var(--fb-inlay)" />
          </g>
        ) : (
          <circle key={fret} cx={pMid.x} cy={pMid.y} r={4} fill="var(--fb-inlay)" />
        )
      })}

      {/* fret wires */}
      {Array.from({ length: fretCount + 1 }, (_, i) => {
        const f = startFret + i
        const isNut = f === 0
        const p1 = xy(alongPos(f), acrossPadStart - 6)
        const p2 = xy(alongPos(f), acrossPadStart + acrossInner + 6)
        return (
          <line
            key={f}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke={isNut ? 'var(--fb-nut)' : 'var(--fb-wire)'}
            strokeWidth={isNut ? 6 : 2}
            strokeLinecap="round"
          />
        )
      })}

      {/* strings */}
      {STRING_NUMBERS.map((s) => {
        const p1 = xy(alongPadStart, acrossPos(s))
        const p2 = xy(alongPadStart + alongInner, acrossPos(s))
        return (
          <line
            key={s}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke="var(--fb-string)"
            strokeWidth={0.6 + (s - 1) * 0.5}
          />
        )
      })}

      {/* string labels */}
      {showStringLabels &&
        STRING_NUMBERS.map((s) => {
          const label = vertical
            ? { x: acrossPos(s), y: 12, anchor: 'middle' as const }
            : { x: 12, y: acrossPos(s) + 4, anchor: 'start' as const }
          return (
            <text
              key={s}
              x={label.x}
              y={label.y}
              textAnchor={label.anchor}
              fontSize={12}
              fill="var(--fb-label)"
              fontFamily="ui-monospace, monospace"
            >
              {STRING_LABELS[s]}
            </text>
          )
        })}

      {/* fret numbers */}
      {showFretNumbers &&
        Array.from({ length: fretCount }, (_, i) => {
          const f = startFret + i + 1
          const label = vertical
            ? { x: acrossExtent - 8, y: alongCenter(f) + 4, anchor: 'end' as const }
            : { x: alongCenter(f), y: acrossExtent - 8, anchor: 'middle' as const }
          return (
            <text
              key={f}
              x={label.x}
              y={label.y}
              fontSize={11}
              textAnchor={label.anchor}
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
            const p = xy(fret === 0 ? openAlong : alongCenter(fret), acrossPos(s))
            return (
              <circle
                key={`${s}-${fret}`}
                cx={p.x}
                cy={p.y}
                r={Math.min(fretSize, stringGap) / 2}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onClick={() => onSelect(s, fret)}
              />
            )
          }),
        )}

      {/* markers */}
      {markers.map((m, i) => {
        const p = xy(m.fret === 0 ? openAlong : alongCenter(m.fret), acrossPos(m.string))
        const variant = m.variant ?? 'primary'
        return (
          <g key={`${m.string}-${m.fret}-${i}`} pointerEvents="none">
            <circle
              cx={p.x}
              cy={p.y}
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
                x={p.x}
                y={p.y + 3.5}
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
