import { pitchClass } from './notes'
import { scaleById } from './scales'
import { STANDARD_TUNING, STRING_NUMBERS, type StringNumber } from './tuning'

export type CagedShapeId = 'C' | 'A' | 'G' | 'E' | 'D'

export const CAGED_SHAPE_IDS: CagedShapeId[] = ['C', 'A', 'G', 'E', 'D']

interface ShapeTemplate {
  /** The string whose open-chord root position locates this shape on the neck. */
  refString: StringNumber
  /** The shape's fret window, relative to the root fret on `refString`. */
  windowLo: number
  windowHi: number
}

/**
 * Each CAGED shape is named for an open chord (C, A, G, E, D major) and,
 * barred up the neck, that shape's own chord tones tell you where its scale
 * "box" sits: the window is just [min, max] fret used by that chord shape,
 * relative to the string most guitarists use to locate its root —
 *   C: x,3,2,0,1,0 (root on the A string, fret 3) -> relative frets 0,-1,-3,-2,-3 -> [-3, +1]
 *   A: x,0,2,2,2,0 (root on the A string, open)    -> relative frets 0,2,2,2,0    -> [0, +4]
 *   G: 3,2,0,0,0,3 (root on the low E, fret 3)      -> relative frets 0,-1,-3,-3,-3,0 -> [-3, +1]
 *   E: 0,2,2,1,0,0 (root on the low E, open)        -> relative frets 0,2,2,1,0,0 -> [0, +4]
 *   D: x,x,0,2,3,2 (root on the D string, open)     -> relative frets 0,2,3,2    -> [0, +4]
 * This is exactly why the shapes interleave up the neck in the order the
 * name spells out: C and G both put their root at the *top* of their own
 * box (window ends 1 fret above it), while A, E and D put it at the
 * *bottom* (window starts right at it) — so for any root note, sorting the
 * five windows by fret position always yields some rotation of C-A-G-E-D.
 */
const CAGED_SHAPES: Record<CagedShapeId, ShapeTemplate> = {
  C: { refString: 5, windowLo: -3, windowHi: 1 },
  A: { refString: 5, windowLo: 0, windowHi: 4 },
  G: { refString: 6, windowLo: -3, windowHi: 1 },
  E: { refString: 6, windowLo: 0, windowHi: 4 },
  D: { refString: 4, windowLo: 0, windowHi: 4 },
}

export interface ShapeWindow {
  shape: CagedShapeId
  /** The fret on the shape's reference string where the root lands, 0-11. */
  refFret: number
  lo: number
  hi: number
}

/** Where shape `id`'s box falls on the neck for a given root pitch class. */
export function shapeWindow(id: CagedShapeId, rootPc: number): ShapeWindow {
  const t = CAGED_SHAPES[id]
  const openPc = pitchClass(STANDARD_TUNING[t.refString])
  const refFret = ((rootPc - openPc) % 12 + 12) % 12
  return { shape: id, refFret, lo: Math.max(0, refFret + t.windowLo), hi: refFret + t.windowHi }
}

/** All 5 shapes for `rootPc`, ordered by neck position (low frets first) —
 *  always some rotation of C-A-G-E-D, the order the shapes actually occur
 *  in as you move up the neck. */
export function shapeOrderForRoot(rootPc: number): ShapeWindow[] {
  return CAGED_SHAPE_IDS.map((id) => shapeWindow(id, rootPc)).sort((a, b) => a.lo - b.lo)
}

export interface ShapeNote {
  string: StringNumber
  fret: number
  midi: number
  /** Semitones above the root, 0-11 (0 and 12 both collapse to 0 = the root). */
  degreeSemitones: number
}

/** Every note of `scaleId` inside a shape's box, sorted low to high pitch. */
export function shapeNotes(window: ShapeWindow, rootPc: number, scaleId: string): ShapeNote[] {
  const tones = new Set(scaleById(scaleId).intervals.map((s) => (rootPc + s) % 12))
  const out: ShapeNote[] = []
  for (const s of STRING_NUMBERS) {
    for (let fret = window.lo; fret <= window.hi; fret++) {
      const midi = STANDARD_TUNING[s] + fret
      const pc = pitchClass(midi)
      if (tones.has(pc)) {
        out.push({ string: s, fret, midi, degreeSemitones: ((pc - rootPc) % 12 + 12) % 12 })
      }
    }
  }
  return out.sort((a, b) => a.midi - b.midi)
}

/** "1", "2b", "2", "3b", "3", "4", "4#", "5", "6b", "6", "7b", "7" — a
 *  generic degree name for any semitone distance from the tonic, independent
 *  of which scale produced it. */
const DEGREE_LABELS = ['1', '2b', '2', '3b', '3', '4', '4#', '5', '6b', '6', '7b', '7']

export function degreeLabel(semitonesFromRoot: number): string {
  return DEGREE_LABELS[((semitonesFromRoot % 12) + 12) % 12]
}
