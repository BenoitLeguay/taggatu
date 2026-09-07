import { useCallback, useEffect, useRef, useState } from 'react'
import { INTERVALS } from '../core/music/intervals'
import { CHORD_FORMULAS, CHORD_LABELS } from '../core/music/chords'
import {
  isAudioUnlocked,
  pluckMidi,
  strumMidis,
  Tone,
  unlockAudio,
} from '../core/audio/engine'
import { Segmented } from '../components/ui/Segmented'

type Mode = 'intervals' | 'chords'

const INTERVAL_CHOICES = INTERVALS.filter((i) => i.semitones > 0 && i.semitones <= 12)
const CHORD_CHOICES = ['maj', 'min', 'dim', 'aug', 'maj7', 'min7', 'dom7']

const ROOT_LOW = 52 // E3
const ROOT_HIGH = 64 // E4

export default function EarTrainer() {
  const [mode, setMode] = useState<Mode>('intervals')
  const [root, setRoot] = useState(60)
  const [answer, setAnswer] = useState<string>('')
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const guard = useRef(false)

  const newRound = useCallback(() => {
    const r = ROOT_LOW + Math.floor(Math.random() * (ROOT_HIGH - ROOT_LOW + 1))
    setRoot(r)
    setRevealed(false)
    setPicked(null)
    if (mode === 'intervals') {
      const choice =
        INTERVAL_CHOICES[Math.floor(Math.random() * INTERVAL_CHOICES.length)]
      setAnswer(String(choice.semitones))
    } else {
      setAnswer(CHORD_CHOICES[Math.floor(Math.random() * CHORD_CHOICES.length)])
    }
  }, [mode])

  useEffect(() => {
    newRound()
  }, [newRound])

  const playPrompt = useCallback(async () => {
    await unlockAudio()
    const now = Tone.now()
    if (mode === 'intervals') {
      const semis = Number(answer)
      pluckMidi(root, now, 0.8)
      pluckMidi(root + semis, now + 0.6, 0.8)
    } else {
      const formula = CHORD_FORMULAS[answer] ?? [0, 4, 7]
      formula.forEach((s, i) => pluckMidi(root + s, now + i * 0.18, 0.75))
      strumMidis(
        formula.map((s) => root + s),
        now + formula.length * 0.18 + 0.15,
      )
    }
  }, [mode, answer, root])

  // auto-play each new round, but only once audio has been unlocked by a gesture
  useEffect(() => {
    if (answer && isAudioUnlocked()) void playPrompt()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answer, root])

  const choose = (value: string) => {
    if (revealed || guard.current) return
    guard.current = true
    setPicked(value)
    setRevealed(true)
    const ok = value === answer
    if (ok) {
      setScore((s) => s + 10 + streak * 2)
      setStreak((s) => s + 1)
    } else {
      setStreak(0)
    }
    setTimeout(() => {
      guard.current = false
      if (ok) newRound()
    }, 900)
  }

  const choices =
    mode === 'intervals'
      ? INTERVAL_CHOICES.map((i) => ({ value: String(i.semitones), label: i.name }))
      : CHORD_CHOICES.map((c) => ({ value: c, label: CHORD_LABELS[c] }))

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <header className="flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-semibold">Ear Training</h1>
        <Segmented
          value={mode}
          onChange={(m) => {
            setMode(m)
            setScore(0)
            setStreak(0)
          }}
          options={[
            { value: 'intervals', label: 'Intervals' },
            { value: 'chords', label: 'Chords' },
          ]}
        />
        <div className="ml-auto text-sm text-muted tabular-nums">
          score <span className="text-text">{score}</span> · streak{' '}
          <span className="text-text">{streak}</span>
        </div>
      </header>

      <div className="rounded-xl border border-border bg-surface p-8 text-center space-y-4">
        <button
          type="button"
          onClick={playPrompt}
          className="h-12 px-6 rounded-lg bg-accent text-black font-semibold hover:brightness-110"
        >
          ▶ Replay
        </button>
        <p className="text-sm text-muted">
          {mode === 'intervals'
            ? 'Two notes, low then high. Name the interval.'
            : 'A chord, arpeggiated then strummed. Name the quality.'}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {choices.map((c) => {
          const state = !revealed
            ? 'idle'
            : c.value === answer
              ? 'right'
              : c.value === picked
                ? 'wrong'
                : 'idle'
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => choose(c.value)}
              className={`py-2.5 rounded-lg border text-sm transition-colors ${
                state === 'right'
                  ? 'border-good text-good bg-good/10'
                  : state === 'wrong'
                    ? 'border-bad text-bad bg-bad/10'
                    : 'border-border bg-surface hover:bg-surface-2 hover:border-accent/40'
              }`}
            >
              {c.label}
            </button>
          )
        })}
      </div>

      {revealed && (
        <div className="text-center">
          <button
            type="button"
            onClick={newRound}
            className="text-sm text-muted hover:text-text underline"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
