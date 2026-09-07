import { useCallback, useEffect, useMemo, useState } from 'react'
import { Fretboard } from '../core/fretboard/Fretboard'
import type { FretMarker } from '../core/fretboard/types'
import { NOTE_NAMES_SHARP, midiToName } from '../core/music/notes'
import { STANDARD_TUNING, type StringNumber } from '../core/music/tuning'
import { pluckMidi, unlockAudio } from '../core/audio/engine'
import { Segmented } from '../components/ui/Segmented'

type Mode = 'find' | 'name'

interface Target {
  string: StringNumber
  fret: number
  midi: number
}

const MAX_FRET = 12

function randomTarget(): Target {
  const string = ((Math.floor(Math.random() * 6) + 1) as StringNumber)
  const fret = Math.floor(Math.random() * (MAX_FRET + 1))
  return { string, fret, midi: STANDARD_TUNING[string] + fret }
}

export default function FretboardTrainer() {
  const [mode, setMode] = useState<Mode>('find')
  const [target, setTarget] = useState<Target>(randomTarget)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [lastClick, setLastClick] = useState<FretMarker | null>(null)

  const next = useCallback(() => {
    setTarget(randomTarget())
    setFeedback(null)
    setLastClick(null)
  }, [])

  useEffect(() => {
    if (feedback === 'correct') {
      const t = setTimeout(next, 650)
      return () => clearTimeout(t)
    }
  }, [feedback, next])

  const targetName = midiToName(target.midi)

  const handleSelect = async (string: StringNumber, fret: number) => {
    if (feedback === 'correct') return
    await unlockAudio()
    const midi = STANDARD_TUNING[string] + fret
    pluckMidi(midi)
    const ok = midiToName(midi) === targetName
    setLastClick({
      string,
      fret,
      variant: ok ? 'correct' : 'wrong',
      label: midiToName(midi),
    })
    register(ok)
  }

  const handleName = async (name: string) => {
    if (feedback === 'correct') return
    await unlockAudio()
    pluckMidi(target.midi)
    register(name === targetName)
  }

  const register = (ok: boolean) => {
    if (ok) {
      setScore((s) => s + 10 + streak * 2)
      setStreak((s) => s + 1)
      setFeedback('correct')
    } else {
      setStreak(0)
      setFeedback('wrong')
    }
  }

  const markers = useMemo<FretMarker[]>(() => {
    const out: FretMarker[] = []
    if (mode === 'name') {
      out.push({
        string: target.string,
        fret: target.fret,
        variant: 'primary',
        label: '?',
      })
    }
    if (lastClick) out.push(lastClick)
    return out
  }, [mode, target, lastClick])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-semibold">Fretboard Trainer</h1>
        <Segmented
          value={mode}
          onChange={(m) => {
            setMode(m)
            next()
            setScore(0)
            setStreak(0)
          }}
          options={[
            { value: 'find', label: 'Find the note' },
            { value: 'name', label: 'Name the note' },
          ]}
        />
        <div className="ml-auto text-sm text-muted tabular-nums">
          score <span className="text-text">{score}</span> · streak{' '}
          <span className="text-text">{streak}</span>
        </div>
      </header>

      <div className="rounded-xl border border-border bg-surface p-6 text-center">
        {mode === 'find' ? (
          <p className="text-lg">
            Play <span className="text-accent font-semibold text-2xl">{targetName}</span>{' '}
            anywhere on the neck (up to fret {MAX_FRET}).
          </p>
        ) : (
          <p className="text-lg">What note is marked <span className="text-accent">?</span></p>
        )}
        {feedback === 'wrong' && (
          <p className="text-bad text-sm mt-2">Not quite — try again.</p>
        )}
        {feedback === 'correct' && (
          <p className="text-good text-sm mt-2">Correct!</p>
        )}
      </div>

      <Fretboard
        toFret={MAX_FRET}
        height={220}
        markers={markers}
        onSelect={mode === 'find' ? handleSelect : undefined}
      />

      {mode === 'name' && (
        <div className="grid grid-cols-6 gap-2">
          {NOTE_NAMES_SHARP.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => handleName(n)}
              className="py-2 rounded-lg border border-border bg-surface hover:bg-surface-2 hover:border-accent/40 font-mono"
            >
              {n}
            </button>
          ))}
        </div>
      )}

      {feedback === 'wrong' && (
        <button
          type="button"
          onClick={next}
          className="text-sm text-muted hover:text-text underline"
        >
          Skip to next
        </button>
      )}
    </div>
  )
}
