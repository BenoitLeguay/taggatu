import type { StringNumber } from '../core/music/tuning'
import { fretToMidi } from '../core/music/tuning'
import raw from './giuliani.json'

export interface ArpNote {
  string: StringNumber
  fret: number
  /** Beats from the start of the measure. */
  start: number
  /** Beats. */
  dur: number
}

export interface ArpMeasure {
  chord: string
  columns: number
  notes: ArpNote[]
}

/**
 * Right-hand fingering for one pattern cycle. `byPosition[i]` is the finger
 * letters for the i-th column of the cycle, ordered top-to-bottom (highest
 * string first). `cycle` is the number of columns before the pattern repeats;
 * 0 means the score gives no fingering.
 */
export interface Fingering {
  cycle: number
  byPosition: string[][]
}

export interface Exercise {
  id: number
  name: string
  timeSignature: [number, number]
  notesPerBar: number
  subdivision: string
  rhythm: 'even'
  flags: string[]
  fingering: Fingering
  measures: ArpMeasure[]
  resolution: { chord: string; notes: { string: StringNumber; fret: number }[] } | null
}

export interface ArpeggioCollection {
  title: string
  composer: string
  opus: string
  note: string
  tuning: string
  exercises: Exercise[]
}

export const collection = raw as unknown as ArpeggioCollection
export const exercises = collection.exercises

export function getExercise(id: number): Exercise | undefined {
  return exercises.find((e) => e.id === id)
}

/** A flat, absolute-time event stream for one exercise, in beats. */
export interface PlaybackEvent {
  beat: number
  dur: number
  string: StringNumber
  fret: number
  midi: number
  measureIndex: number
  /** RH finger for this attack, if the score hints one. */
  finger?: string
}

export interface PlaybackPlan {
  events: PlaybackEvent[]
  /** Total length in beats (measures actually included). */
  totalBeats: number
  beatsPerMeasure: number
}

export interface BuildPlanOptions {
  /** Include the held resolution chord (measure 3). Default false for looping. */
  includeResolution?: boolean
}

/**
 * Flattens an exercise's measures into one ordered event list with absolute
 * beat positions, ready to hand to the scheduler or the note highway.
 */
export function buildPlaybackPlan(
  ex: Exercise,
  opts: BuildPlanOptions = {},
): PlaybackPlan {
  const beatsPerMeasure = ex.timeSignature[0]
  const measures = opts.includeResolution ? ex.measures : ex.measures.slice(0, 2)
  const events: PlaybackEvent[] = []

  const { cycle, byPosition } = ex.fingering

  measures.forEach((measure, measureIndex) => {
    const offset = measureIndex * beatsPerMeasure
    const colStarts = [...new Set(measure.notes.map((n) => n.start))].sort(
      (a, b) => a - b,
    )
    measure.notes.forEach((n) => {
      let finger: string | undefined
      if (cycle > 0 && measureIndex <= 1) {
        const colIdx = colStarts.indexOf(n.start)
        const fingers = byPosition[((colIdx % cycle) + cycle) % cycle] ?? []
        if (fingers.length) {
          // rank this note within its column, highest string (pitch) first
          const colNotes = measure.notes
            .filter((x) => x.start === n.start)
            .sort((a, b) => a.string - b.string)
          const rank = colNotes.findIndex((x) => x.string === n.string)
          finger = fingers[Math.min(Math.max(rank, 0), fingers.length - 1)]
        }
      }
      events.push({
        beat: offset + n.start,
        dur: n.dur,
        string: n.string,
        fret: n.fret,
        midi: fretToMidi(n.string, n.fret),
        measureIndex,
        finger,
      })
    })
  })

  events.sort((a, b) => a.beat - b.beat || a.string - b.string)
  return {
    events,
    totalBeats: measures.length * beatsPerMeasure,
    beatsPerMeasure,
  }
}

/** Rough 1-5 difficulty from note density and string span. */
export function difficulty(ex: Exercise): number {
  const npb = ex.notesPerBar
  const strings = new Set(ex.measures[0]?.notes.map((n) => n.string))
  let score = 1
  if (npb >= 6) score = 2
  if (npb >= 12) score = 3
  if (npb >= 16) score = 4
  if (npb >= 20 || strings.size >= 6) score = 5
  if (ex.flags.includes('rhythm-approx')) score = Math.min(5, score + 1)
  return score
}

export const CHORD_TONE_LABEL: Record<string, string> = {
  C: 'C major',
  G7: 'G dominant 7th',
}
