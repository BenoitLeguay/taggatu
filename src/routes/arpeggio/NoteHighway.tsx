import { useMemo } from 'react'
import { STRING_LABELS, STRING_NUMBERS } from '../../core/music/tuning'
import { midiToName } from '../../core/music/notes'
import type { PlaybackEvent } from '../../data/arpeggios'

interface NoteHighwayProps {
  events: PlaybackEvent[]
  totalBeats: number
  beatsPerMeasure: number
  loopBeat: number | null
  countInBeatsLeft: number | null
  /** Chord label per bar, e.g. ["C", "G7/B"]. */
  measureNames: string[]
  showFingering: boolean
  showNoteNames: boolean
}

const WIDTH = 1000
const HEIGHT = 340
const PAD_TOP = 30
const PAD_BOTTOM = 26
const NOW_X = 190
const BEATS_AHEAD = 3.1
const BEATS_BEHIND = 1.0
const NOTE_R = 17

/**
 * The scrolling fretboard: six string lanes, notes flowing right-to-left past a
 * fixed NOW line. One transform moves the whole note layer each frame, so cost
 * stays flat. Colour tells you a note's state: far = calm blue, approaching =
 * bright, on the line = green, gone = dim.
 */
export function NoteHighway({
  events,
  totalBeats,
  beatsPerMeasure,
  loopBeat,
  countInBeatsLeft,
  measureNames,
  showFingering,
  showNoteNames,
}: NoteHighwayProps) {
  const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM
  const laneGap = innerH / (STRING_NUMBERS.length - 1)
  const laneY = (s: number) => PAD_TOP + (s - 1) * laneGap
  const pxPerBeat = (WIDTH - NOW_X) / BEATS_AHEAD

  const measureLines = useMemo(() => {
    const out: { beat: number; label: string }[] = []
    let i = 0
    for (let b = 0; b < totalBeats; b += beatsPerMeasure) {
      out.push({ beat: b, label: measureNames[i] ?? '' })
      i++
    }
    return out
  }, [totalBeats, beatsPerMeasure, measureNames])

  const pos = loopBeat ?? 0
  const layerShift = NOW_X - pos * pxPerBeat
  const noteX = (beat: number) => beat * pxPerBeat
  // draw three loop copies so wrap-around is seamless
  const copies = [-totalBeats, 0, totalBeats]

  const minVisibleBeat = pos - BEATS_BEHIND
  const maxVisibleBeat = pos + BEATS_AHEAD + 0.5

  return (
    <div className="rounded-xl border border-border bg-[#0b0d10] overflow-hidden relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full block"
        role="img"
        aria-label="Scrolling fretboard"
      >
        {/* lane stripes + strings */}
        {STRING_NUMBERS.map((s) => (
          <g key={s}>
            {s % 2 === 0 && (
              <rect
                x={0}
                y={laneY(s) - laneGap / 2}
                width={WIDTH}
                height={laneGap}
                fill="#ffffff"
                opacity={0.02}
              />
            )}
            <line
              x1={0}
              x2={WIDTH}
              y1={laneY(s)}
              y2={laneY(s)}
              stroke="#5b6472"
              strokeWidth={0.75 + (s - 1) * 0.7}
              opacity={0.55}
            />
          </g>
        ))}

        {/* hit zone */}
        <rect
          x={NOW_X - NOTE_R - 3}
          y={6}
          width={2 * (NOTE_R + 3)}
          height={HEIGHT - 12}
          fill="var(--color-good)"
          opacity={0.08}
        />

        {/* moving note layer */}
        <g transform={`translate(${layerShift} 0)`}>
          {copies.map((copyOffset) => (
            <g key={copyOffset} transform={`translate(${copyOffset * pxPerBeat} 0)`}>
              {/* beat ticks */}
              {Array.from({ length: totalBeats + 1 }, (_, b) => (
                <line
                  key={b}
                  x1={noteX(b)}
                  x2={noteX(b)}
                  y1={PAD_TOP - 12}
                  y2={HEIGHT - PAD_BOTTOM + 12}
                  stroke="#2b323d"
                  strokeWidth={1}
                  opacity={0.5}
                />
              ))}
              {/* measure dividers + chord labels */}
              {measureLines.map((m) => (
                <g key={m.beat}>
                  <line
                    x1={noteX(m.beat)}
                    x2={noteX(m.beat)}
                    y1={10}
                    y2={HEIGHT - 10}
                    stroke="var(--color-muted)"
                    strokeWidth={2}
                    opacity={0.7}
                  />
                  <text
                    x={noteX(m.beat) + 8}
                    y={22}
                    fontSize={14}
                    fontWeight={700}
                    fill="var(--color-muted)"
                    fontFamily="var(--font-mono)"
                  >
                    {m.label}
                  </text>
                </g>
              ))}

              {events.map((ev, i) => {
                const beatHere = ev.beat + copyOffset
                if (beatHere < minVisibleBeat || beatHere > maxVisibleBeat) {
                  return null
                }
                const rel = beatHere - pos // >0 ahead, <0 gone
                const x = noteX(ev.beat)
                const y = laneY(ev.string)

                let fill = 'var(--color-cool)'
                let textFill = '#06263d'
                let ring = 'none'
                let opacity = 1
                if (rel < -0.12) {
                  fill = '#3a4250'
                  textFill = '#9aa4b2'
                  opacity = Math.max(0.25, 1 + rel / BEATS_BEHIND)
                } else if (rel <= 0.12) {
                  fill = 'var(--color-good)'
                  textFill = '#05230f'
                  ring = '#ffffff'
                } else if (rel < 0.9) {
                  fill = '#8fd0ff'
                  textFill = '#06263d'
                }

                return (
                  <g key={`${copyOffset}-${i}`} opacity={opacity}>
                    {ring !== 'none' && (
                      <circle cx={x} cy={y} r={NOTE_R + 4} fill="none" stroke={ring} strokeWidth={2} />
                    )}
                    <circle
                      cx={x}
                      cy={y}
                      r={NOTE_R}
                      fill={fill}
                      stroke="#0b0d10"
                      strokeWidth={2}
                    />
                    <text
                      x={x}
                      y={y + 5}
                      fontSize={15}
                      fontWeight={700}
                      textAnchor="middle"
                      fill={textFill}
                      fontFamily="var(--font-mono)"
                    >
                      {showNoteNames ? midiToName(ev.midi) : ev.fret}
                    </text>
                    {showFingering && ev.finger && (
                      <text
                        x={x}
                        y={y - NOTE_R - 6}
                        fontSize={12}
                        textAnchor="middle"
                        fill="var(--color-accent)"
                        fontFamily="var(--font-mono)"
                      >
                        {ev.finger}
                      </text>
                    )}
                  </g>
                )
              })}
            </g>
          ))}
        </g>

        {/* string labels (fixed, on top) */}
        {STRING_NUMBERS.map((s) => (
          <g key={s}>
            <rect x={0} y={laneY(s) - 12} width={30} height={24} fill="#0b0d10" />
            <text
              x={8}
              y={laneY(s) + 5}
              fontSize={15}
              fontWeight={700}
              fill="var(--color-muted)"
              fontFamily="var(--font-mono)"
            >
              {STRING_LABELS[s]}
            </text>
          </g>
        ))}

        {/* NOW line */}
        <line x1={NOW_X} x2={NOW_X} y1={4} y2={HEIGHT - 4} stroke="var(--color-good)" strokeWidth={2.5} />
        <polygon
          points={`${NOW_X - 7},4 ${NOW_X + 7},4 ${NOW_X},14`}
          fill="var(--color-good)"
        />
      </svg>

      {countInBeatsLeft != null && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/45">
          <span className="text-6xl font-bold text-accent tabular-nums">
            {countInBeatsLeft}
          </span>
        </div>
      )}
    </div>
  )
}
