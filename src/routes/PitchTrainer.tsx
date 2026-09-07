import { useEffect, useRef, useState } from 'react'
import { usePitchDetect } from '../core/pitch/usePitchDetect'
import { midiToName, nameToMidi } from '../core/music/notes'
import { pluckMidi, unlockAudio } from '../core/audio/engine'
import { Segmented } from '../components/ui/Segmented'

type Mode = 'tuner' | 'challenge'

const OPEN_STRINGS = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']
// comfortable single-note challenge range: G2..C5
const CHALLENGE_LOW = nameToMidi('G2')
const CHALLENGE_HIGH = nameToMidi('C5')

export default function PitchTrainer() {
  const [mode, setMode] = useState<Mode>('tuner')
  const { listening, error, pitch, start, stop } = usePitchDetect()

  const [targetMidi, setTargetMidi] = useState(() => randomTarget())
  const [hits, setHits] = useState(0)
  const holdRef = useRef(0)
  const [held, setHeld] = useState(0)

  function randomTarget() {
    return (
      CHALLENGE_LOW +
      Math.floor(Math.random() * (CHALLENGE_HIGH - CHALLENGE_LOW + 1))
    )
  }

  // challenge: hold the target within ±20 cents for ~0.6s to score. The mic is
  // an external system, so an effect is the right place; it only pushes state
  // when the integer hold count actually changes.
  useEffect(() => {
    let nextHold = holdRef.current
    if (mode !== 'challenge' || !pitch) {
      nextHold = 0
    } else if (pitch.midi === targetMidi && Math.abs(pitch.cents) <= 20) {
      nextHold = holdRef.current + 1
      if (nextHold > 36) {
        setHits((h) => h + 1)
        setTargetMidi(randomTarget())
        nextHold = 0
      }
    } else {
      nextHold = Math.max(0, holdRef.current - 2)
    }
    if (nextHold !== holdRef.current) {
      holdRef.current = nextHold
      setHeld(nextHold)
    }
  }, [pitch, mode, targetMidi])

  const cents = pitch?.cents ?? 0
  const inTune = pitch && Math.abs(cents) <= 5

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <header className="flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-semibold">Pitch &amp; Tuner</h1>
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'tuner', label: 'Tuner' },
            { value: 'challenge', label: 'Play the note' },
          ]}
        />
      </header>

      {!listening ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center space-y-3">
          <p className="text-muted text-sm">
            This uses your microphone, in the browser only — nothing is recorded
            or uploaded.
          </p>
          <button
            type="button"
            onClick={start}
            className="h-11 px-6 rounded-lg bg-accent text-black font-semibold hover:brightness-110"
          >
            Enable microphone
          </button>
          {error && <p className="text-bad text-sm">{error}</p>}
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-surface p-8">
            {mode === 'tuner' ? (
              <div className="text-center">
                <div className="text-6xl font-semibold tabular-nums">
                  {pitch ? midiToName(pitch.midi, { withOctave: true }) : '—'}
                </div>
                <div className="mt-4 relative h-3 rounded-full bg-surface-2 overflow-hidden">
                  <div className="absolute inset-y-0 left-1/2 w-px bg-muted" />
                  {pitch && (
                    <div
                      className="absolute inset-y-0 w-2 rounded-full transition-all"
                      style={{
                        left: `calc(50% + ${Math.max(-50, Math.min(50, cents))}% )`,
                        background: inTune
                          ? 'var(--color-good)'
                          : 'var(--color-accent)',
                        transform: 'translateX(-50%)',
                      }}
                    />
                  )}
                </div>
                <div
                  className={`mt-2 text-sm tabular-nums ${
                    inTune ? 'text-good' : 'text-muted'
                  }`}
                >
                  {pitch ? `${cents > 0 ? '+' : ''}${cents} cents` : 'play a note'}
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <p className="text-sm text-muted">Play and hold</p>
                <div className="text-6xl font-semibold">
                  {midiToName(targetMidi, { withOctave: true })}
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await unlockAudio()
                    pluckMidi(targetMidi)
                  }}
                  className="text-sm text-muted underline hover:text-text"
                >
                  hear it
                </button>
                <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                  <div
                    className="h-full bg-good transition-all"
                    style={{ width: `${Math.min(100, (held / 36) * 100)}%` }}
                  />
                </div>
                <div className="text-sm text-muted">
                  solved: <span className="text-text">{hits}</span>
                  {pitch && (
                    <span className="ml-3">
                      you: {midiToName(pitch.midi, { withOctave: true })} (
                      {cents > 0 ? '+' : ''}
                      {cents})
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">
              open strings: {OPEN_STRINGS.join('  ')}
            </span>
            <button
              type="button"
              onClick={stop}
              className="text-muted hover:text-text underline"
            >
              stop mic
            </button>
          </div>
        </>
      )}
    </div>
  )
}
