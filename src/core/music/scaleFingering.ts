import { scaleById } from './scales'
import { FRETS_ON_NECK, STANDARD_TUNING, STRING_NUMBERS, type StringNumber } from './tuning'

export interface ScaleFingeringStep {
  string: StringNumber
  fret: number
  midi: number
  /** 0 = the starting root ("Do"), up to the scale length = the octave ("Do" again). */
  degree: number
}

export type ScalePath = ScaleFingeringStep[]

const SEARCH_MAX_FRET = FRETS_ON_NECK
const MAX_PATHS = 32
/** A comfortable one-finger-per-fret hand span: frets [center, center+4]. */
const WINDOW_SPAN = 4

function candidatesForMidi(midi: number): { string: StringNumber; fret: number }[] {
  const out: { string: StringNumber; fret: number }[] = []
  for (const s of STRING_NUMBERS) {
    const fret = midi - STANDARD_TUNING[s]
    if (fret >= 0 && fret <= SEARCH_MAX_FRET) out.push({ string: s, fret })
  }
  return out
}

interface Branch {
  path: ScalePath
  /** Low fret of the current hand position; the "reach" is [center, center+WINDOW_SPAN]. */
  center: number
}

/**
 * Every distinct "stay in the current hand position as long as possible"
 * path through one octave of `scaleId`, starting at (startString, startFret).
 *
 * A pure "always take the single nearest fret" greedy search sounds right
 * but isn't: on an open low E, the closest note to F# (fret 2) is G# (fret
 * 4) is *always* one more fret up the same string, so it never notices that
 * hopping to the open A string is the natural, idiomatic move — it just
 * keeps creeping up one string for the whole octave. Real scale fingering
 * instead holds a hand position (here, a 5-fret window) and only shifts
 * position when the next note genuinely isn't reachable from where the hand
 * already is. Within a position, moving to another string at a reachable
 * fret is free (a sideways finger move, not a hand shift); across strings
 * tied at the same fret distance when a shift *is* forced, the fingering
 * genuinely forks and each option becomes its own path.
 */
export function generateScalePaths(
  startString: StringNumber,
  startFret: number,
  scaleId = 'major',
): ScalePath[] {
  const scale = scaleById(scaleId)
  const rootMidi = STANDARD_TUNING[startString] + startFret
  const targets = [...scale.intervals, 12].map((semi) => rootMidi + semi)

  let branches: Branch[] = [
    {
      path: [{ string: startString, fret: startFret, midi: rootMidi, degree: 0 }],
      center: startFret,
    },
  ]

  for (let degree = 1; degree < targets.length; degree++) {
    const midi = targets[degree]
    const candidates = candidatesForMidi(midi)
    if (candidates.length === 0) return [] // target unreachable within SEARCH_MAX_FRET

    const next: Branch[] = []
    outer: for (const { path, center } of branches) {
      const prev = path[path.length - 1]
      const inReach = candidates.filter((c) => c.fret >= center && c.fret <= center + WINDOW_SPAN)
      // prefer staying in the current position; only look further afield
      // (and shift position) when nothing in reach can play this note
      const pool = inReach.length > 0 ? inReach : candidates
      const minDist = Math.min(...pool.map((c) => Math.abs(c.fret - prev.fret)))
      const nearest = pool.filter((c) => Math.abs(c.fret - prev.fret) === minDist)
      for (const c of nearest) {
        const newCenter = inReach.length > 0 ? center : c.fret
        next.push({ path: [...path, { ...c, midi, degree }], center: newCenter })
        if (next.length >= MAX_PATHS) break outer
      }
    }
    branches = next
  }

  return branches.map((b) => b.path)
}
