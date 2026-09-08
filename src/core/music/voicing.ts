import { CHORD_FORMULAS } from './chords'
import { pitchClass } from './notes'
import {
  FRETS_ON_NECK,
  STANDARD_TUNING,
  STRING_NUMBERS,
  type StringNumber,
} from './tuning'

export interface ChordVoicing {
  /** Fret per string, or null if the string is muted. */
  frets: Record<StringNumber, number | null>
  /** Lowest fretted note (0 if any string rings open). */
  positionFret: number
  isOpen: boolean
}

const SPAN = 4
const BASS_TO_TREBLE: StringNumber[] = [6, 5, 4, 3, 2, 1]

/**
 * Finds one playable voicing inside a `SPAN`-fret window: walk bass to
 * treble, and once a string can carry the root, "land" the bass there (or
 * mute strings below it that can't); every string above free-fills with its
 * lowest available chord tone. This is exactly the reasoning that produces
 * the standard open-position shapes (try it on E, A, C, D, G, Am) — it just
 * runs the logic instead of hard-coding the answer, so it works uniformly
 * for every root and every chord quality already in `CHORD_FORMULAS`.
 */
function voicingAtWindow(
  rootPc: number,
  quality: string,
  windowStart: number,
): ChordVoicing | null {
  const formula = CHORD_FORMULAS[quality]
  if (!formula) throw new Error(`Unknown chord quality: ${quality}`)
  const tones = new Set(formula.map((semi) => (rootPc + semi) % 12))

  const lo = windowStart
  const hi = windowStart + SPAN
  const frets = {} as Record<StringNumber, number | null>
  let landed = false

  const candidatesFor = (s: StringNumber) => {
    const open = STANDARD_TUNING[s]
    const out: number[] = []
    for (let f = lo; f <= hi; f++) {
      if (tones.has(pitchClass(open + f))) out.push(f)
    }
    return out
  }

  for (const s of BASS_TO_TREBLE) {
    const candidates = candidatesFor(s)
    if (candidates.length === 0) {
      frets[s] = null
      continue
    }
    if (!landed) {
      const rootFret = candidates.find(
        (f) => pitchClass(STANDARD_TUNING[s] + f) === rootPc,
      )
      if (rootFret !== undefined) {
        frets[s] = rootFret
        landed = true
      } else {
        frets[s] = null
      }
    } else {
      frets[s] = Math.min(...candidates)
    }
  }

  // Root never reachable in this window (rare) — fall back to the lowest
  // string with any chord tone rather than muting every string.
  if (!landed) {
    for (const s of BASS_TO_TREBLE) {
      const candidates = candidatesFor(s)
      if (candidates.length > 0) {
        frets[s] = Math.min(...candidates)
        landed = true
        break
      }
    }
  }

  const soundingFrets = STRING_NUMBERS.map((s) => frets[s]).filter(
    (f): f is number => f != null,
  )
  if (soundingFrets.length < 3) return null

  const positionFret = Math.min(...soundingFrets)
  return { frets, positionFret, isOpen: positionFret === 0 }
}

/**
 * Up to `maxVoicings` distinct, ascending-position voicings of `quality`
 * built on `rootPc`, from the nut up the neck.
 */
export function findChordVoicings(
  rootPc: number,
  quality: string,
  maxVoicings = 5,
): ChordVoicing[] {
  const out: ChordVoicing[] = []
  let lastKey = ''
  let lastPosition = -1
  for (let w = 0; w <= FRETS_ON_NECK - SPAN; w++) {
    const v = voicingAtWindow(rootPc, quality, w)
    if (!v || v.positionFret <= lastPosition) continue
    const key = STRING_NUMBERS.map((s) => v.frets[s] ?? 'x').join(',')
    if (key === lastKey) continue
    lastKey = key
    lastPosition = v.positionFret
    out.push(v)
    if (out.length >= maxVoicings) break
  }
  return out
}
