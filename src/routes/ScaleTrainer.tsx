import { useCallback, useEffect, useRef, useState } from 'react'
import { Fretboard } from '../core/fretboard/Fretboard'
import type { FretMarker } from '../core/fretboard/types'
import { Toggle } from '../components/ui/Toggle'
import { pluckMidi, unlockAudio } from '../core/audio/engine'
import { degreeLabel, pitchClass, SOLFEGE_NAMES } from '../core/music/notes'
import { SCALES, scaleById } from '../core/music/scales'
import { walkOctave, type Direction, type WalkStep } from '../core/music/scaleWalk'
import { STANDARD_TUNING, STRING_NUMBERS, type StringNumber } from '../core/music/tuning'

const DISPLAY_MAX_FRET = 19
const START_FRET_MAX = 9
const MIN_BPM = 30
const MAX_BPM = 220

type Position = { string: StringNumber; fret: number }
type Round = { direction: Direction; steps: WalkStep[] }

function octaveLength(scaleId: string): number {
  return scaleById(scaleId).intervals.length + 1
}

function endpointOf(round: Round): Position {
  const last = round.steps[round.steps.length - 1]
  return { string: last.string, fret: last.fret }
}

/** Picks whichever direction(s) can actually complete a full octave from
 *  `pos` (running off the neck — like descending an octave below open A,
 *  which needs a string lower than low E — rules a direction out) and
 *  chooses randomly between the ones that can. */
function chooseRound(pos: Position, scaleId: string): { direction: Direction; steps: WalkStep[] } {
  const expected = octaveLength(scaleId)
  const up = walkOctave(pos.string, pos.fret, 'up', scaleId)
  const down = walkOctave(pos.string, pos.fret, 'down', scaleId)
  const upOk = up.length === expected
  const downOk = down.length === expected
  if (upOk && downOk) return Math.random() < 0.5 ? { direction: 'up', steps: up } : { direction: 'down', steps: down }
  if (upOk) return { direction: 'up', steps: up }
  if (downOk) return { direction: 'down', steps: down }
  return up.length >= down.length ? { direction: 'up', steps: up } : { direction: 'down', steps: down }
}

/** A random neck position that actually plays `tonicPc` and can complete at
 *  least one direction's octave from there. */
function randomStartForTonic(tonicPc: number, scaleId: string): Position {
  const expected = octaveLength(scaleId)
  for (let i = 0; i < 20; i++) {
    const string = (Math.floor(Math.random() * STRING_NUMBERS.length) + 1) as StringNumber
    const openPc = pitchClass(STANDARD_TUNING[string])
    const fret = Math.min(START_FRET_MAX, ((tonicPc - openPc) % 12 + 12) % 12)
    const up = walkOctave(string, fret, 'up', scaleId)
    const down = walkOctave(string, fret, 'down', scaleId)
    if (up.length === expected || down.length === expected) return { string, fret }
  }
  return { string: 6, fret: 0 } // always playable
}

export default function ScaleTrainer() {
  const [tonicPc, setTonicPc] = useState(0) // C
  const [scaleId, setScaleId] = useState('major')
  const [vertical, setVertical] = useState(false)
  const [bpm, setBpm] = useState(90)
  const [playing, setPlaying] = useState(false)

  const [initialPos] = useState(() => randomStartForTonic(0, 'major'))
  const [initialRound] = useState(() => chooseRound(initialPos, 'major'))
  const [initialNextRound] = useState(() => chooseRound(endpointOf(initialRound), 'major'))

  const [round, setRound] = useState<Round>(initialRound)
  const [nextRound, setNextRound] = useState<Round>(initialNextRound)
  const [stepIndex, setStepIndex] = useState(0)

  const roundRef = useRef(round)
  const nextRoundRef = useRef(nextRound)
  const stepIndexRef = useRef(0)
  const scaleIdRef = useRef(scaleId)
  const bpmRef = useRef(bpm)
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    scaleIdRef.current = scaleId
  }, [scaleId])
  useEffect(() => {
    bpmRef.current = bpm
  }, [bpm])

  const stop = useCallback(() => {
    if (intervalRef.current) window.clearInterval(intervalRef.current)
    intervalRef.current = null
    setPlaying(false)
  }, [])

  const startFreshRound = useCallback((pc: number, sid: string) => {
    const pos = randomStartForTonic(pc, sid)
    const r0 = chooseRound(pos, sid)
    const r1 = chooseRound(endpointOf(r0), sid)
    roundRef.current = r0
    nextRoundRef.current = r1
    stepIndexRef.current = 0
    setRound(r0)
    setNextRound(r1)
    setStepIndex(0)
  }, [])

  const selectTonic = useCallback(
    (pc: number) => {
      stop()
      setTonicPc(pc)
      startFreshRound(pc, scaleId)
    },
    [scaleId, stop, startFreshRound],
  )

  const selectScale = useCallback(
    (id: string) => {
      stop()
      setScaleId(id)
      startFreshRound(tonicPc, id)
    },
    [tonicPc, stop, startFreshRound],
  )

  const newStart = useCallback(() => {
    stop()
    startFreshRound(tonicPc, scaleId)
  }, [tonicPc, scaleId, stop, startFreshRound])

  const playStep = useCallback(() => {
    const note = roundRef.current.steps[stepIndexRef.current]
    if (note) pluckMidi(note.midi)
  }, [])

  const tick = useCallback(() => {
    const current = roundRef.current.steps
    const next = stepIndexRef.current + 1
    if (next >= current.length) {
      // this run just reached its octave — the next one was already decided
      // (and shown as the "Next" preview) when this run started, so swap it
      // in now and immediately look one further ahead. Skip index 0 since
      // that note is the one we just played.
      const newCurrent = nextRoundRef.current
      const newNext = chooseRound(endpointOf(newCurrent), scaleIdRef.current)
      roundRef.current = newCurrent
      nextRoundRef.current = newNext
      stepIndexRef.current = newCurrent.steps.length > 1 ? 1 : 0
      setRound(newCurrent)
      setNextRound(newNext)
    } else {
      stepIndexRef.current = next
    }
    setStepIndex(stepIndexRef.current)
    playStep()
  }, [playStep])

  const restartInterval = useCallback(() => {
    if (intervalRef.current) window.clearInterval(intervalRef.current)
    intervalRef.current = window.setInterval(tick, (60 / bpmRef.current) * 1000)
  }, [tick])

  const play = useCallback(async () => {
    await unlockAudio()
    stepIndexRef.current = 0
    setStepIndex(0)
    setPlaying(true)
    playStep()
    restartInterval()
  }, [playStep, restartInterval])

  const togglePlay = () => (playing ? stop() : void play())

  // live tempo changes: keep the current note, just re-time the clock
  useEffect(() => {
    if (playing) restartInterval()
  }, [bpm, playing, restartInterval])

  useEffect(() => {
    return () => stop()
  }, [stop])

  const degreeLabelFor = (midi: number) =>
    degreeLabel(((pitchClass(midi) - tonicPc) % 12 + 12) % 12)

  const currentMarkers: FretMarker[] = round.steps.map((step, i) => {
    const variant: FretMarker['variant'] =
      i < stepIndex ? 'ghost' : i === stepIndex ? 'primary' : 'chord'
    return { string: step.string, fret: step.fret, variant, label: degreeLabelFor(step.midi) }
  })

  // the next run is decided the moment this one starts, so it can be shown
  // ahead of time instead of appearing only once it's due to be played —
  // grayed out, on the same board, so it reads as "coming after this" at a
  // glance. Its first note is skipped: that's the exact note the current
  // run ends on, already shown by currentMarkers.
  const nextMarkers: FretMarker[] = nextRound.steps.slice(1).map((step) => ({
    string: step.string,
    fret: step.fret,
    variant: 'muted' as const,
    label: degreeLabelFor(step.midi),
  }))
  const markers = [...nextMarkers, ...currentMarkers]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-semibold">Scale Trainer</h1>
        <span className="text-sm text-muted">
          A random octave up or down, then straight into another from wherever you land.
        </span>
      </header>

      <div>
        <div className="text-xs text-muted mb-1.5">Tonic (fixed-do — Do is always C)</div>
        <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
          {SOLFEGE_NAMES.map((name, pc) => (
            <button
              key={name}
              type="button"
              onClick={() => selectTonic(pc)}
              className={`py-1.5 rounded-lg border text-sm font-mono transition-colors ${
                pc === tonicPc
                  ? 'border-accent bg-accent/15 text-accent'
                  : 'border-border bg-surface hover:bg-surface-2 hover:border-muted'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs text-muted mb-1.5">Scale</div>
          <div className="flex flex-wrap gap-1.5">
            {SCALES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => selectScale(s.id)}
                className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                  s.id === scaleId
                    ? 'border-accent bg-accent/15 text-accent'
                    : 'border-border bg-surface hover:bg-surface-2 hover:border-muted'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <Toggle label="Vertical" checked={vertical} onChange={() => setVertical((v) => !v)} />
      </div>

      <div className="flex items-center justify-center gap-3 rounded-xl border border-border bg-surface py-3">
        <span className={`text-2xl ${round.direction === 'up' ? 'text-good' : 'text-accent'}`}>
          {round.direction === 'up' ? '↑' : '↓'}
        </span>
        <span className="text-lg font-semibold">
          {round.direction === 'up' ? 'Montée' : 'Descente'}
        </span>
        <span className="text-sm text-muted">
          · next: {nextRound.direction === 'up' ? '↑ montée' : '↓ descente'} (grayed out below)
        </span>
      </div>

      <Fretboard
        fromFret={0}
        toFret={DISPLAY_MAX_FRET}
        height={220}
        vertical={vertical}
        markers={markers}
        onSelect={async (string: StringNumber, fret: number) => {
          await unlockAudio()
          pluckMidi(STANDARD_TUNING[string] + fret)
        }}
      />

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border border-border bg-surface p-4">
        <button
          type="button"
          onClick={togglePlay}
          className="h-11 w-28 rounded-lg bg-accent text-black font-semibold hover:brightness-110 transition"
        >
          {playing ? '❚❚ Stop' : '▶ Play'}
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">BPM</span>
          <input
            type="range"
            min={MIN_BPM}
            max={MAX_BPM}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            className="w-40 sm:w-52"
          />
          <input
            type="number"
            min={MIN_BPM}
            max={MAX_BPM}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            className="w-16 bg-surface-2 border border-border rounded-md px-2 py-1 text-sm text-center tabular-nums"
          />
        </div>

        <button
          type="button"
          onClick={newStart}
          className="h-9 px-4 rounded-lg border border-border text-sm hover:bg-surface-2 hover:border-muted transition-colors"
        >
          🎲 New start
        </button>
      </div>

      <p className="text-xs text-muted">
        Numbers are scale degrees from the tonic (1, 2b, 2, 3b, 3, 4...), not
        note names. Each octave — montée (up) or descente (down) — is picked
        at random, then the next one starts right where this one ends, so the
        run keeps moving across the neck instead of resetting. It's decided
        as soon as the current run starts, so the gray notes on the fretboard
        show you where it's headed — keep an eye on them to stay in rhythm
        instead of discovering it the moment it has to be played. Blue notes
        are coming up, orange is the one to play now, faded ones are already
        played.
      </p>
    </div>
  )
}
