import type { CSSProperties } from 'react'

export type BeatState = 'accent' | 'normal' | 'off'

interface MetronomeVisualProps {
  /** One entry per beat in the measure; its length is the beat count. */
  beatStates: BeatState[]
  /** Beat inside the current loop (0..beatStates.length), or null during count-in. */
  loopBeat: number | null
  countInBeatsLeft: number | null
  playing: boolean
  /** When provided, each dot becomes a button that cycles its own state. */
  onBeatClick?: (index: number) => void
  /** 'sm' (default): compact readout, e.g. next to the arpeggio transport.
   *  'lg': large tap targets for a dedicated metronome view. */
  size?: 'sm' | 'lg'
}

const DOT_SIZE = {
  sm: { accent: 13, normal: 10, off: 9, border: 1.5 },
  lg: { accent: 76, normal: 62, off: 54, border: 3 },
}

/**
 * A row of beat dots synced to the same clock that drives the audio click, so
 * the flash never drifts from what you hear. The active dot's fade is driven
 * by the fractional part of the beat position, updated every animation frame.
 * Passing `onBeatClick` turns the dots into per-beat mute/accent toggles
 * (used by the Metronome trainer); omit it for a purely visual readout.
 */
export function MetronomeVisual({
  beatStates,
  loopBeat,
  countInBeatsLeft,
  playing,
  onBeatClick,
  size = 'sm',
}: MetronomeVisualProps) {
  const beatsPerMeasure = beatStates.length
  const dotSize = DOT_SIZE[size]
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

  const interactive = Boolean(onBeatClick)

  return (
    <div
      className={`flex items-center flex-wrap justify-center ${size === 'lg' ? 'gap-5' : 'gap-2'}`}
      aria-hidden={interactive ? undefined : true}
    >
      {beatStates.map((state, i) => {
        const isActive = playing && activeIndex === i
        const px =
          state === 'accent' ? dotSize.accent : state === 'off' ? dotSize.off : dotSize.normal

        const style: CSSProperties = {
          width: px,
          height: px,
          transform: isActive ? `scale(${1 + 0.55 * pulse})` : 'scale(1)',
        }
        if (state === 'off') {
          style.backgroundColor = 'transparent'
          style.border = `${dotSize.border}px solid var(--color-muted)`
          style.opacity = isActive ? 0.6 + 0.4 * pulse : 0.35
        } else {
          style.backgroundColor =
            state === 'accent' ? 'var(--color-accent)' : 'var(--color-muted)'
          style.opacity = isActive ? 0.45 + 0.55 * pulse : 0.3
        }

        const dot = (
          <span
            aria-hidden
            className="block rounded-full transition-transform duration-75 ease-out"
            style={style}
          />
        )

        if (!interactive) return <span key={i}>{dot}</span>

        return (
          <button
            key={i}
            type="button"
            onClick={() => onBeatClick!(i)}
            aria-label={`Beat ${i + 1}: ${state}, click to change`}
            className={`rounded-full hover:bg-surface-2 transition-colors ${size === 'lg' ? 'p-2 -m-2' : 'p-1.5 -m-1.5'}`}
          >
            {dot}
          </button>
        )
      })}
    </div>
  )
}
