import { pitchClass } from './notes'
import { scaleById } from './scales'
import { FRETS_ON_NECK, STANDARD_TUNING, STRING_NUMBERS, type StringNumber } from './tuning'

export type Direction = 'up' | 'down'

export interface WalkStep {
  string: StringNumber
  fret: number
  midi: number
}

/** A comfortable one-finger-per-fret hand span. */
const WINDOW_SPAN = 4

function candidatesForMidi(midi: number): { string: StringNumber; fret: number }[] {
  const out: { string: StringNumber; fret: number }[] = []
  for (const s of STRING_NUMBERS) {
    const fret = midi - STANDARD_TUNING[s]
    if (fret >= 0 && fret <= FRETS_ON_NECK) out.push({ string: s, fret })
  }
  return out
}

/** Semitone offsets from the root for one full octave, in the direction of
 *  travel: ascending is just the scale's own intervals plus the octave;
 *  descending walks the same pitch classes in decreasing order, e.g. major's
 *  0,2,4,5,7,9,11 going down becomes 0,-1,-3,-5,-7,-8,-10,-12 (the octave
 *  below), not the ascending list negated wholesale. */
function targetOffsets(scaleId: string, direction: Direction): number[] {
  const { intervals } = scaleById(scaleId)
  if (direction === 'up') return [...intervals, 12]
  const descending = [...intervals].slice(1).reverse().map((iv) => iv - 12)
  return [0, ...descending, -12]
}

/**
 * One octave of `scaleId`, starting at (startString, startFret) and moving
 * up or down, one step per scale degree. At each step, prefer a note
 * reachable within the current hand position (a 4-fret window); only shift
 * position when the next degree genuinely isn't reachable from there. A pure
 * "always take the nearest fret" search sounds equivalent but isn't: on an
 * open low E, the closest note to F# (fret 2) is G# (fret 4) is *always* one
 * more fret up the same string, so it never notices that hopping to the
 * open A string for the next degree is the natural move — it just creeps up
 * one string for the whole octave. Holding a position avoids that. Ties are
 * broken at random, so replaying the same starting note doesn't always give
 * the same fingering.
 */
export function walkOctave(
  startString: StringNumber,
  startFret: number,
  direction: Direction,
  scaleId: string,
): WalkStep[] {
  const startMidi = STANDARD_TUNING[startString] + startFret
  const offsets = targetOffsets(scaleId, direction)

  const steps: WalkStep[] = [{ string: startString, fret: startFret, midi: startMidi }]
  let center = startFret
  let prevFret = startFret

  for (let i = 1; i < offsets.length; i++) {
    const midi = startMidi + offsets[i]
    const candidates = candidatesForMidi(midi)
    if (candidates.length === 0) break // ran off the neck; hand back what we have

    const windowLo = direction === 'up' ? center : Math.max(0, center - WINDOW_SPAN)
    const windowHi = direction === 'up' ? center + WINDOW_SPAN : center
    const inReach = candidates.filter((c) => c.fret >= windowLo && c.fret <= windowHi)
    const pool = inReach.length > 0 ? inReach : candidates

    const minDist = Math.min(...pool.map((c) => Math.abs(c.fret - prevFret)))
    const nearest = pool.filter((c) => Math.abs(c.fret - prevFret) === minDist)
    const choice = nearest[Math.floor(Math.random() * nearest.length)]

    if (inReach.length === 0) center = choice.fret
    prevFret = choice.fret
    steps.push({ string: choice.string, fret: choice.fret, midi })
  }

  return steps
}

/** Pitch class 0-11 helper re-exported for convenience at call sites that
 *  only have a WalkStep, not a raw midi number. */
export function walkStepPitchClass(step: WalkStep): number {
  return pitchClass(step.midi)
}
