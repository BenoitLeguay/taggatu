export interface IntervalDef {
  semitones: number
  name: string
  short: string
}

export const INTERVALS: IntervalDef[] = [
  { semitones: 0, name: 'Unison', short: 'P1' },
  { semitones: 1, name: 'Minor 2nd', short: 'm2' },
  { semitones: 2, name: 'Major 2nd', short: 'M2' },
  { semitones: 3, name: 'Minor 3rd', short: 'm3' },
  { semitones: 4, name: 'Major 3rd', short: 'M3' },
  { semitones: 5, name: 'Perfect 4th', short: 'P4' },
  { semitones: 6, name: 'Tritone', short: 'TT' },
  { semitones: 7, name: 'Perfect 5th', short: 'P5' },
  { semitones: 8, name: 'Minor 6th', short: 'm6' },
  { semitones: 9, name: 'Major 6th', short: 'M6' },
  { semitones: 10, name: 'Minor 7th', short: 'm7' },
  { semitones: 11, name: 'Major 7th', short: 'M7' },
  { semitones: 12, name: 'Octave', short: 'P8' },
]

export function intervalBySemitones(semitones: number): IntervalDef | undefined {
  return INTERVALS.find((i) => i.semitones === semitones)
}
