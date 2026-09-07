import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Fretboard } from '../../core/fretboard/Fretboard'
import type { FretMarker } from '../../core/fretboard/types'
import type { StringNumber } from '../../core/music/tuning'
import { useSettings } from '../../store/settings'
import { useProgress } from '../../store/progress'
import { exercises, getExercise } from '../../data/arpeggios'
import { ArpeggioList } from './ArpeggioList'
import { NoteHighway } from './NoteHighway'
import { TransportBar } from './TransportBar'
import { useArpeggioPlayer } from './useArpeggioPlayer'

const exImg = (id: number) =>
  `${import.meta.env.BASE_URL}exercises/ex-${String(id).padStart(3, '0')}.png`

/** Shows the score/tab crop, keeping the previous image visible until the new
 *  one has decoded so switching exercises doesn't flash white. */
function ScoreImage({ id, name }: { id: number; name: string }) {
  const [shown, setShown] = useState(id)
  const pending = id !== shown ? id : null

  useEffect(() => {
    if (id === shown) return
    let cancelled = false
    const img = new Image()
    img.src = exImg(id)
    const swap = () => {
      if (!cancelled) setShown(id)
    }
    img.decode?.().then(swap, swap)
    return () => {
      cancelled = true
    }
  }, [id, shown])

  return (
    <div className="relative border-t border-border overflow-x-auto bg-white">
      <img
        key={shown}
        src={exImg(shown)}
        alt={`Standard notation and tab for Giuliani ${name}`}
        className="min-w-[720px] w-full"
        decoding="async"
      />
      {pending != null && (
        <div className="absolute top-2 right-3 text-[11px] text-neutral-400">
          loading…
        </div>
      )}
    </div>
  )
}

const CHORD_SHAPES: Record<string, { string: StringNumber; fret: number | null }[]> = {
  C: [
    { string: 1, fret: 0 },
    { string: 2, fret: 1 },
    { string: 3, fret: 0 },
    { string: 4, fret: 2 },
    { string: 5, fret: 3 },
    { string: 6, fret: null },
  ],
  G7: [
    { string: 1, fret: 1 },
    { string: 2, fret: 0 },
    { string: 3, fret: 0 },
    { string: 4, fret: 0 },
    { string: 5, fret: 2 },
    { string: 6, fret: 3 },
  ],
}

function shapeMarkers(chord: string): FretMarker[] {
  return (CHORD_SHAPES[chord] ?? []).map((n) =>
    n.fret === null
      ? { string: n.string, fret: 0, variant: 'muted', label: '×' }
      : { string: n.string, fret: n.fret, variant: 'chord', label: String(n.fret) },
  )
}

export default function ArpeggioTrainer() {
  const [params, setParams] = useSearchParams()
  const idParam = Number(params.get('ex'))
  const [selectedId, setSelectedId] = useState(
    getExercise(idParam) ? idParam : exercises[0].id,
  )
  const exercise = getExercise(selectedId)!
  const settings = useSettings()
  const recordLoop = useProgress((s) => s.recordLoop)

  const player = useArpeggioPlayer(exercise)
  const lastCounted = useRef(0)

  useEffect(() => {
    setParams((p) => {
      p.set('ex', String(selectedId))
      return p
    })
  }, [selectedId, setParams])

  // prefetch neighbouring score images so switching is instant
  useEffect(() => {
    for (const n of [selectedId - 1, selectedId + 1, selectedId + 2]) {
      if (n >= 1 && n <= exercises.length) {
        const img = new Image()
        img.src = exImg(n)
      }
    }
  }, [selectedId])

  // log a practiced loop for progress stats
  useEffect(() => {
    if (player.loopCount > lastCounted.current) {
      lastCounted.current = player.loopCount
      recordLoop(exercise.id, player.bpm)
    }
    if (player.loopCount === 0) lastCounted.current = 0
  }, [player.loopCount, player.bpm, exercise.id, recordLoop])

  const select = (id: number) => {
    player.stop()
    setSelectedId(id)
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <ArpeggioList selectedId={selectedId} onSelect={select} />

      <div className="space-y-5 min-w-0">
        <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-2xl font-semibold">
            Giuliani {exercise.name}
          </h1>
          <span className="text-muted text-sm">
            {exercise.subdivision} · {exercise.notesPerBar} notes/bar · C → G7
          </span>
          {exercise.flags.includes('rhythm-approx') && (
            <span className="text-xs text-muted border border-border rounded-full px-2 py-0.5">
              rhythm normalised
            </span>
          )}
        </header>

        <NoteHighway
          events={player.events}
          totalBeats={player.totalBeats}
          beatsPerMeasure={player.beatsPerMeasure}
          loopBeat={player.loopBeat}
          countInBeatsLeft={player.countInBeatsLeft}
          showFingering={settings.showFingering}
          showNoteNames={settings.showNoteNames}
        />

        <TransportBar player={player} />

        <details className="rounded-xl border border-border bg-surface" open>
          <summary className="cursor-pointer select-none px-4 py-2.5 text-sm text-muted hover:text-text">
            Score &amp; tab
          </summary>
          <ScoreImage id={exercise.id} name={exercise.name} />
        </details>

        <section className="grid gap-4 sm:grid-cols-2">
          {(['C', 'G7'] as const).map((chord) => (
            <div key={chord} className="rounded-xl border border-border bg-surface p-3">
              <div className="text-sm text-muted mb-1">
                Measure {chord === 'C' ? '1' : '2'} — {chord} shape (left hand held)
              </div>
              <Fretboard
                fromFret={0}
                toFret={4}
                height={150}
                markers={shapeMarkers(chord)}
              />
            </div>
          ))}
        </section>

        <p className="text-xs text-muted">
          The left hand holds the chord shape for the whole bar; only the
          right-hand picking pattern changes from study to study. Fingering marks
          (t/i/m/a) come from the score and repeat every bar.
        </p>
      </div>
    </div>
  )
}
