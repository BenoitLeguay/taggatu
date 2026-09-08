interface MetronomeVisualProps {
  beatsPerMeasure: number
  /** Beat inside the current loop (0..totalBeats), or null during count-in. */
  loopBeat: number | null
  countInBeatsLeft: number | null
  playing: boolean
  accentFirstBeat: boolean
}

/**
 * A row of beat dots synced to the same clock that drives the audio click
 * (`loopBeat`/`countInBeatsLeft` from `useArpeggioPlayer`), so the flash never
 * drifts from what you hear. The active dot's fade is driven by the
 * fractional part of the beat position, updated every animation frame.
 */
export function MetronomeVisual({
  beatsPerMeasure,
  loopBeat,
  countInBeatsLeft,
  playing,
  accentFirstBeat,
}: MetronomeVisualProps) {
  let activeIndex: number | null = null
  let pulse = 0

  if (countInBeatsLeft != null) {
    activeIndex =
      ((beatsPerMeasure - countInBeatsLeft) % beatsPerMeasure + beatsPerMeasure) %
      beatsPerMeasure
    pulse = 1
  } else if (loopBeat != null) {
    const pos = ((loopBeat % beatsPerMeasure) + beatsPerMeasure) % beatsPerMeasure
    activeIndex = Math.floor(pos)
    const frac = pos - activeIndex
    pulse = Math.max(0, 1 - frac / 0.35)
  }

  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {Array.from({ length: beatsPerMeasure }, (_, i) => {
        const isAccent = i === 0 && accentFirstBeat
        const isActive = playing && activeIndex === i
        const size = isAccent ? 11 : 9
        return (
          <span
            key={i}
            className="block rounded-full transition-transform duration-75 ease-out"
            style={{
              width: size,
              height: size,
              backgroundColor: isAccent ? 'var(--color-accent)' : 'var(--color-muted)',
              opacity: isActive ? 0.45 + 0.55 * pulse : 0.3,
              transform: isActive ? `scale(${1 + 0.55 * pulse})` : 'scale(1)',
            }}
          />
        )
      })}
    </div>
  )
}
