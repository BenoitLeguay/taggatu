import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Fretboard } from '../core/fretboard/Fretboard'
import type { FretMarker } from '../core/fretboard/types'
import { Toggle } from '../components/ui/Toggle'
import { pluckMidi, unlockAudio } from '../core/audio/engine'
import { SCALES } from '../core/music/scales'
import { generateScalePaths, type ScalePath } from '../core/music/scaleFingering'
import { STANDARD_TUNING, STRING_NUMBERS, type StringNumber } from '../core/music/tuning'

const SOLFEGE = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si', 'Do']
const START_FRET_MAX = 9
const DISPLAY_MAX_FRET = 19
const MIN_BPM = 30
const MAX_BPM = 220

function randomStart(): { string: StringNumber; fret: number } {
  const string = (Math.floor(Math.random() * STRING_NUMBERS.length) + 1) as StringNumber
  const fret = Math.floor(Math.random() * (START_FRET_MAX + 1))
  return { string, fret }
}

/** A start position is only useful once we know it actually has a fingering
 *  (starting right at the top of the neck on the high e string can run out
 *  of room for a full octave). */
function randomPlayableStart(scaleId: string): { string: StringNumber; fret: number } {
  for (let i = 0; i < 20; i++) {
    const s = randomStart()
    if (generateScalePaths(s.string, s.fret, scaleId).length > 0) return s
  }
  return { string: 6, fret: 0 } // always playable
}

function shuffledIndices(n: number): number[] {
  const out = Array.from({ length: n }, (_, i) => i)
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** A fresh shuffle that never puts `exclude` first, so refilling the queue
 *  right after finishing that pattern can't immediately repeat it (unless
 *  it's the only pattern there is, in which case repeating is unavoidable). */
function shuffledExcludingFirst(n: number, exclude: number): number[] {
  if (n <= 1) return Array.from({ length: n }, (_, i) => i)
  const order = shuffledIndices(n)
  if (order[0] !== exclude) return order
  const swapAt = 1 + Math.floor(Math.random() * (n - 1))
  ;[order[0], order[swapAt]] = [order[swapAt], order[0]]
  return order
}

function degreeLabel(i: number, last: number, scaleId: string): string {
  if (scaleId === 'major') return SOLFEGE[i] ?? String(i + 1)
  return i === last ? '1' : String(i + 1)
}

export default function ScaleTrainer() {
  const [scaleId, setScaleIdState] = useState('major')
  const [start, setStartState] = useState(() => randomPlayableStart('major'))
  const [bpm, setBpm] = useState(90)
  const [playing, setPlaying] = useState(false)
  const [vertical, setVertical] = useState(false)
  const [step, setStep] = useState(0)

  const paths = useMemo(
    () => generateScalePaths(start.string, start.fret, scaleId),
    [start, scaleId],
  )

  const [initialOrder] = useState(() => shuffledIndices(paths.length))
  const [pathIndex, setPathIndexState] = useState(() => initialOrder[0] ?? 0)

  const pathsRef = useRef<ScalePath[]>(paths)
  const queueRef = useRef<number[]>(initialOrder.slice(1))
  const pathIndexRef = useRef(initialOrder[0] ?? 0)
  const stepRef = useRef(0)
  const bpmRef = useRef(bpm)
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    pathsRef.current = paths
  }, [paths])
  useEffect(() => {
    bpmRef.current = bpm
  }, [bpm])

  const stop = useCallback(() => {
    if (intervalRef.current) window.clearInterval(intervalRef.current)
    intervalRef.current = null
    setPlaying(false)
  }, [])

  const resetTo = useCallback((freshPaths: ScalePath[]) => {
    pathsRef.current = freshPaths
    const order = shuffledIndices(freshPaths.length)
    pathIndexRef.current = order[0] ?? 0
    queueRef.current = order.slice(1)
    stepRef.current = 0
    setPathIndexState(pathIndexRef.current)
    setStep(0)
  }, [])

  const rerollDo = useCallback(() => {
    stop()
    const s = randomPlayableStart(scaleId)
    setStartState(s)
    resetTo(generateScalePaths(s.string, s.fret, scaleId))
  }, [scaleId, stop, resetTo])

  const selectScale = useCallback(
    (id: string) => {
      stop()
      const s = randomPlayableStart(id)
      setScaleIdState(id)
      setStartState(s)
      resetTo(generateScalePaths(s.string, s.fret, id))
    },
    [stop, resetTo],
  )

  const goToPattern = useCallback(
    (i: number) => {
      stop()
      pathIndexRef.current = i
      stepRef.current = 0
      setPathIndexState(i)
      setStep(0)
    },
    [stop],
  )

  const playStep = useCallback((idx: number) => {
    const note = pathsRef.current[pathIndexRef.current]?.[idx]
    if (note) pluckMidi(note.midi)
  }, [])

  const tick = useCallback(() => {
    const path = pathsRef.current[pathIndexRef.current]
    const nextStep = stepRef.current + 1
    if (!path || nextStep >= path.length) {
      // completed the octave — cycle to a different fingering, reshuffling
      // once every pattern for this "Do" has been used
      if (queueRef.current.length === 0) {
        queueRef.current = shuffledExcludingFirst(
          pathsRef.current.length,
          pathIndexRef.current,
        )
      }
      pathIndexRef.current = queueRef.current.shift() ?? 0
      stepRef.current = 0
    } else {
      stepRef.current = nextStep
    }
    setPathIndexState(pathIndexRef.current)
    setStep(stepRef.current)
    playStep(stepRef.current)
  }, [playStep])

  const restartInterval = useCallback(() => {
    if (intervalRef.current) window.clearInterval(intervalRef.current)
    intervalRef.current = window.setInterval(tick, (60 / bpmRef.current) * 1000)
  }, [tick])

  const play = useCallback(async () => {
    await unlockAudio()
    stepRef.current = 0
    setStep(0)
    setPlaying(true)
    playStep(0)
    restartInterval()
  }, [playStep, restartInterval])

  const togglePlay = () => (playing ? stop() : void play())

  // live tempo changes: keep the current step, just re-time the clock
  useEffect(() => {
    if (playing) restartInterval()
  }, [bpm, playing, restartInterval])

  useEffect(() => {
    return () => stop()
  }, [stop])

  const activePath = useMemo(
    () => paths[Math.min(pathIndex, paths.length - 1)] ?? [],
    [paths, pathIndex],
  )

  const markers = useMemo<FretMarker[]>(() => {
    return activePath.map((note, i) => {
      const variant: FretMarker['variant'] =
        i < step ? 'ghost' : i === step ? 'primary' : 'chord'
      return {
        string: note.string,
        fret: note.fret,
        variant,
        label: degreeLabel(i, activePath.length - 1, scaleId),
      }
    })
  }, [activePath, step, scaleId])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-semibold">Scale Trainer</h1>
        <span className="text-sm text-muted">
          {SOLFEGE.slice(0, 7).join('-')}… follow the note lit up on the neck.
        </span>
      </header>

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

      <Fretboard
        fromFret={0}
        toFret={DISPLAY_MAX_FRET}
        height={220}
        vertical={vertical}
        markers={markers}
        onSelect={async (string, fret) => {
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
          onClick={rerollDo}
          className="h-9 px-4 rounded-lg border border-border text-sm hover:bg-surface-2 hover:border-muted transition-colors"
        >
          🎲 New Do
        </button>

        {paths.length > 1 && (
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => goToPattern((pathIndex - 1 + paths.length) % paths.length)}
              className="h-8 w-8 rounded-md border border-border text-sm hover:bg-surface-2 hover:border-muted transition-colors"
            >
              ‹
            </button>
            <span className="text-sm text-muted tabular-nums">
              Pattern {pathIndex + 1} of {paths.length}
            </span>
            <button
              type="button"
              onClick={() => goToPattern((pathIndex + 1) % paths.length)}
              className="h-8 w-8 rounded-md border border-border text-sm hover:bg-surface-2 hover:border-muted transition-colors"
            >
              ›
            </button>
          </div>
        )}
      </div>

      <p className="text-xs text-muted">
        &ldquo;Do&rdquo; is picked at random anywhere on the neck. Blue notes are
        coming up, orange is the one to play now, faded ones are already
        played. {paths.length > 1 ? `This starting note has ${paths.length} equally natural fingerings — browse them above, or just keep playing: a different one is picked automatically each time you loop back to Do.` : 'This starting note has one natural nearest-position fingering.'}
      </p>
    </div>
  )
}
