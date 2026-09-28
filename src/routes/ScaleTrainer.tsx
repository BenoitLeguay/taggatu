import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Fretboard } from '../core/fretboard/Fretboard'
import type { FretMarker } from '../core/fretboard/types'
import { Segmented } from '../components/ui/Segmented'
import { Toggle } from '../components/ui/Toggle'
import { pluckMidi, unlockAudio } from '../core/audio/engine'
import {
  CAGED_SHAPE_IDS,
  degreeLabel,
  shapeNotes,
  shapeOrderForRoot,
  shapeWindow,
  type CagedShapeId,
  type ShapeNote,
} from '../core/music/cagedShapes'
import { SOLFEGE_NAMES } from '../core/music/notes'
import { SCALES } from '../core/music/scales'
import { STANDARD_TUNING, type StringNumber } from '../core/music/tuning'

type Mode = 'shape' | 'circulate'

const DISPLAY_MAX_FRET = 19
const MIN_BPM = 30
const MAX_BPM = 220

/** Ascend through a shape's notes, then back down to (but not repeating)
 *  the first — the standard way to drill a box. */
function upDownSequence(notes: ShapeNote[]): ShapeNote[] {
  if (notes.length <= 1) return notes
  return [...notes, ...notes.slice(0, -1).reverse()]
}

function computeSegments(
  mode: Mode,
  shapeId: CagedShapeId,
  tonicPc: number,
  scaleId: string,
): { segments: ShapeNote[][]; shapeSequence: CagedShapeId[] } {
  if (mode === 'shape') {
    const w = shapeWindow(shapeId, tonicPc)
    return { segments: [upDownSequence(shapeNotes(w, tonicPc, scaleId))], shapeSequence: [shapeId] }
  }
  const order = shapeOrderForRoot(tonicPc)
  return {
    segments: order.map((w) => upDownSequence(shapeNotes(w, tonicPc, scaleId))),
    shapeSequence: order.map((w) => w.shape),
  }
}

export default function ScaleTrainer() {
  const [tonicPc, setTonicPc] = useState(0) // C
  const [scaleId, setScaleId] = useState('major')
  const [mode, setMode] = useState<Mode>('shape')
  const [shapeId, setShapeId] = useState<CagedShapeId>('C')
  const [vertical, setVertical] = useState(false)
  const [bpm, setBpm] = useState(90)
  const [playing, setPlaying] = useState(false)
  const [segmentIndex, setSegmentIndex] = useState(0)
  const [noteIndex, setNoteIndex] = useState(0)

  const { segments, shapeSequence } = useMemo(
    () => computeSegments(mode, shapeId, tonicPc, scaleId),
    [mode, shapeId, tonicPc, scaleId],
  )

  const segmentsRef = useRef(segments)
  const segmentIndexRef = useRef(0)
  const noteIndexRef = useRef(0)
  const bpmRef = useRef(bpm)
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    segmentsRef.current = segments
  }, [segments])
  useEffect(() => {
    bpmRef.current = bpm
  }, [bpm])

  const stop = useCallback(() => {
    if (intervalRef.current) window.clearInterval(intervalRef.current)
    intervalRef.current = null
    setPlaying(false)
  }, [])

  const resetTo = useCallback((freshSegments: ShapeNote[][]) => {
    segmentsRef.current = freshSegments
    segmentIndexRef.current = 0
    noteIndexRef.current = 0
    setSegmentIndex(0)
    setNoteIndex(0)
  }, [])

  const selectTonic = useCallback(
    (pc: number) => {
      stop()
      setTonicPc(pc)
      resetTo(computeSegments(mode, shapeId, pc, scaleId).segments)
    },
    [mode, shapeId, scaleId, stop, resetTo],
  )

  const selectScale = useCallback(
    (id: string) => {
      stop()
      setScaleId(id)
      resetTo(computeSegments(mode, shapeId, tonicPc, id).segments)
    },
    [mode, shapeId, tonicPc, stop, resetTo],
  )

  const selectMode = useCallback(
    (m: Mode) => {
      stop()
      setMode(m)
      resetTo(computeSegments(m, shapeId, tonicPc, scaleId).segments)
    },
    [shapeId, tonicPc, scaleId, stop, resetTo],
  )

  const selectShape = useCallback(
    (id: CagedShapeId) => {
      stop()
      setShapeId(id)
      resetTo(computeSegments(mode, id, tonicPc, scaleId).segments)
    },
    [mode, tonicPc, scaleId, stop, resetTo],
  )

  const playStep = useCallback(() => {
    const note = segmentsRef.current[segmentIndexRef.current]?.[noteIndexRef.current]
    if (note) pluckMidi(note.midi)
  }, [])

  const tick = useCallback(() => {
    const segs = segmentsRef.current
    const current = segs[segmentIndexRef.current]
    const nextNote = noteIndexRef.current + 1
    if (!current || nextNote >= current.length) {
      segmentIndexRef.current = (segmentIndexRef.current + 1) % Math.max(1, segs.length)
      noteIndexRef.current = 0
    } else {
      noteIndexRef.current = nextNote
    }
    setSegmentIndex(segmentIndexRef.current)
    setNoteIndex(noteIndexRef.current)
    playStep()
  }, [playStep])

  const restartInterval = useCallback(() => {
    if (intervalRef.current) window.clearInterval(intervalRef.current)
    intervalRef.current = window.setInterval(tick, (60 / bpmRef.current) * 1000)
  }, [tick])

  const play = useCallback(async () => {
    await unlockAudio()
    segmentIndexRef.current = 0
    noteIndexRef.current = 0
    setSegmentIndex(0)
    setNoteIndex(0)
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

  const activeSegment = useMemo(
    () => segments[Math.min(segmentIndex, segments.length - 1)] ?? [],
    [segments, segmentIndex],
  )

  const markers = useMemo<FretMarker[]>(() => {
    return activeSegment.map((note, i) => {
      const variant: FretMarker['variant'] =
        i < noteIndex ? 'ghost' : i === noteIndex ? 'primary' : 'chord'
      return {
        string: note.string,
        fret: note.fret,
        variant,
        label: degreeLabel(note.degreeSemitones),
      }
    })
  }, [activeSegment, noteIndex])

  const currentShape = shapeSequence[Math.min(segmentIndex, shapeSequence.length - 1)]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-semibold">Scale Trainer</h1>
        <span className="text-sm text-muted">CAGED scale shapes — learn one, then link them up the neck.</span>
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

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <div className="text-xs text-muted mb-1.5">Mode</div>
          <Segmented
            value={mode}
            onChange={selectMode}
            options={[
              { value: 'shape', label: 'Shape' },
              { value: 'circulate', label: 'Circulate' },
            ]}
          />
        </div>

        {mode === 'shape' ? (
          <div>
            <div className="text-xs text-muted mb-1.5">Shape</div>
            <div className="flex gap-1.5">
              {CAGED_SHAPE_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectShape(id)}
                  className={`h-9 w-9 rounded-lg border text-sm font-semibold transition-colors ${
                    id === shapeId
                      ? 'border-accent bg-accent/15 text-accent'
                      : 'border-border bg-surface hover:bg-surface-2 hover:border-muted'
                  }`}
                >
                  {id}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted">
            Shape {segmentIndex + 1} of {shapeSequence.length}:{' '}
            <span className="text-text font-semibold">{currentShape}</span> —{' '}
            {shapeSequence.join(' → ')}
          </div>
        )}
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
      </div>

      <p className="text-xs text-muted">
        Numbers are scale degrees from the tonic (1, 2b, 2, 3b, 3, 4...), not note
        names. Blue notes are coming up, orange is the one to play now, faded
        ones are already played.{' '}
        {mode === 'shape'
          ? 'Shape mode drills one CAGED box up and down — pick C, A, G, E or D above.'
          : 'Circulate mode plays each shape in turn, low to high, in the order they naturally fall on the neck (always some rotation of C-A-G-E-D).'}
      </p>
    </div>
  )
}
