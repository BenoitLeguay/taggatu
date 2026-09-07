import { useMemo } from 'react'
import { STRING_LABELS, STRING_NUMBERS } from '../../core/music/tuning'
import { midiToName } from '../../core/music/notes'
import type { PlaybackEvent } from '../../data/arpeggios'

interface NoteHighwayProps {
  events: PlaybackEvent[]
  totalBeats: number
  beatsPerMeasure: number
  loopBeat: number | null
  showFingering: boolean
  showNoteNames: boolean
}

const HEIGHT = 260
const NOW_X = 130
const BEATS_AHEAD = 4.5

/**
 * The scrolling fretboard: six horizontal string lanes with the note pills for
 * the exercise flowing right-to-left past a fixed NOW line. The whole note
 * layer is positioned once and moved each frame by translating a group, so
 * per-frame cost stays flat regardless of note count.
 */
export function NoteHighway({
  events,
  totalBeats,
  beatsPerMeasure,
  loopBeat,
  showFingering,
  showNoteNames,
}: NoteHighwayProps) {
  const width = 900
  const pxPerBeat = (width - NOW_X) / BEATS_AHEAD
  const laneGap = (HEIGHT - 40) / (STRING_NUMBERS.length - 1)
  const laneY = (s: number) => 20 + (s - 1) * laneGap

  const measureLines = useMemo(() => {
    const lines: number[] = []
    for (let b = 0; b <= totalBeats; b += beatsPerMeasure) lines.push(b)
    return lines
  }, [totalBeats, beatsPerMeasure])

  const beatTicks = useMemo(() => {
    const t: number[] = []
    for (let b = 0; b <= totalBeats; b++) t.push(b)
    return t
  }, [totalBeats])

  const pos = loopBeat ?? 0
  // render the note layer three times (previous / current / next loop) so the
  // wrap-around is seamless
  const copies = [-totalBeats, 0, totalBeats]

  const noteX = (beat: number) => beat * pxPerBeat
  const layerShift = NOW_X - pos * pxPerBeat

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${HEIGHT}`}
        className="w-full"
        style={{ display: 'block' }}
        role="img"
        aria-label="Scrolling fretboard"
      >
        {/* lane backgrounds */}
        {STRING_NUMBERS.map((s) => (
          <g key={s}>
            <line
              x1={0}
              x2={width}
              y1={laneY(s)}
              y2={laneY(s)}
              stroke="var(--fb-string)"
              strokeWidth={0.5 + (s - 1) * 0.45}
              opacity={0.5}
            />
            <text
              x={10}
              y={laneY(s) + 4}
              fontSize={12}
              fill="var(--fb-label)"
              fontFamily="var(--font-mono)"
            >
              {STRING_LABELS[s]}
            </text>
          </g>
        ))}

        {/* moving note layer */}
        <g transform={`translate(${layerShift} 0)`}>
          {copies.map((copyOffset) => (
            <g key={copyOffset} transform={`translate(${copyOffset * pxPerBeat} 0)`}>
              {/* measure / beat grid travels with the notes */}
              {beatTicks.map((b) => (
                <line
                  key={`t${b}`}
                  x1={noteX(b)}
                  x2={noteX(b)}
                  y1={12}
                  y2={HEIGHT - 12}
                  stroke="var(--color-border)"
                  strokeWidth={1}
                  opacity={0.35}
                />
              ))}
              {measureLines.map((b) => (
                <line
                  key={`m${b}`}
                  x1={noteX(b)}
                  x2={noteX(b)}
                  y1={8}
                  y2={HEIGHT - 8}
                  stroke="var(--color-muted)"
                  strokeWidth={1.5}
                  opacity={0.55}
                />
              ))}

              {events.map((ev, i) => {
                const x = noteX(ev.beat)
                const y = laneY(ev.string)
                const dist = Math.abs(ev.beat + copyOffset - pos)
                const active = dist < 0.14
                const w = Math.max(18, ev.dur * pxPerBeat - 4)
                return (
                  <g key={`${copyOffset}-${i}`}>
                    <rect
                      x={x - 11}
                      y={y - 11}
                      width={Math.max(22, w)}
                      height={22}
                      rx={11}
                      fill={active ? 'var(--color-accent)' : 'var(--color-accent-soft)'}
                      opacity={active ? 1 : 0.9}
                      stroke={active ? '#fff' : 'transparent'}
                      strokeWidth={1.5}
                    />
                    <text
                      x={x}
                      y={y + 4}
                      fontSize={12}
                      fontWeight={600}
                      textAnchor="middle"
                      fill="#14181d"
                      fontFamily="var(--font-mono)"
                    >
                      {showNoteNames ? midiToName(ev.midi) : ev.fret}
                    </text>
                    {showFingering && ev.finger && (
                      <text
                        x={x}
                        y={y - 16}
                        fontSize={10}
                        textAnchor="middle"
                        fill="var(--color-muted)"
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

        {/* NOW line (fixed) */}
        <line
          x1={NOW_X}
          x2={NOW_X}
          y1={4}
          y2={HEIGHT - 4}
          stroke="var(--color-accent)"
          strokeWidth={2}
        />
        <polygon
          points={`${NOW_X - 6},4 ${NOW_X + 6},4 ${NOW_X},12`}
          fill="var(--color-accent)"
        />
      </svg>
    </div>
  )
}
