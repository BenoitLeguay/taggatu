export interface ScaleDef {
  id: string
  label: string
  /** Semitone offsets from the root, ascending, one octave, root not repeated. */
  intervals: number[]
}

export const SCALES: ScaleDef[] = [
  { id: 'major', label: 'Major', intervals: [0, 2, 4, 5, 7, 9, 11] },
  { id: 'minor', label: 'Natural Minor', intervals: [0, 2, 3, 5, 7, 8, 10] },
  { id: 'dorian', label: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10] },
  { id: 'phrygian', label: 'Phrygian', intervals: [0, 1, 3, 5, 7, 8, 10] },
  { id: 'lydian', label: 'Lydian', intervals: [0, 2, 4, 6, 7, 9, 11] },
  { id: 'mixolydian', label: 'Mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10] },
  { id: 'locrian', label: 'Locrian', intervals: [0, 1, 3, 5, 6, 8, 10] },
  { id: 'harmonic-minor', label: 'Harmonic Minor', intervals: [0, 2, 3, 5, 7, 8, 11] },
  { id: 'major-pentatonic', label: 'Major Pentatonic', intervals: [0, 2, 4, 7, 9] },
  { id: 'minor-pentatonic', label: 'Minor Pentatonic', intervals: [0, 3, 5, 7, 10] },
  { id: 'blues', label: 'Blues', intervals: [0, 3, 5, 6, 7, 10] },
]

export function scaleById(id: string): ScaleDef {
  const def = SCALES.find((s) => s.id === id)
  if (!def) throw new Error(`Unknown scale: ${id}`)
  return def
}

/** Pitch classes (0-11) belonging to `scaleId` transposed to `rootPc`. */
export function scalePitchClasses(rootPc: number, scaleId: string): Set<number> {
  const def = scaleById(scaleId)
  return new Set(def.intervals.map((semi) => (rootPc + semi) % 12))
}
