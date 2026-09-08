import { nameToMidi, pitchClass } from './notes'

/** Chord quality -> semitone offsets from the root. */
export const CHORD_FORMULAS: Record<string, number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  dom7: [0, 4, 7, 10],
  dim7: [0, 3, 6, 9],
  m7b5: [0, 3, 6, 10],
}

/** Short chord-symbol suffix, e.g. root "C" + CHORD_SYMBOLS.dom7 = "C7". */
export const CHORD_SYMBOLS: Record<string, string> = {
  maj: '',
  min: 'm',
  dim: 'dim',
  aug: 'aug',
  sus2: 'sus2',
  sus4: 'sus4',
  maj7: 'maj7',
  min7: 'm7',
  dom7: '7',
  dim7: 'dim7',
  m7b5: 'm7♭5',
}

export const CHORD_LABELS: Record<string, string> = {
  maj: 'major',
  min: 'minor',
  dim: 'diminished',
  aug: 'augmented',
  sus2: 'sus2',
  sus4: 'sus4',
  maj7: 'major 7th',
  min7: 'minor 7th',
  dom7: 'dominant 7th',
  dim7: 'diminished 7th',
  m7b5: 'half-diminished',
}

export function chordPitchClasses(rootName: string, quality: string): number[] {
  const rootPc = pitchClass(nameToMidi(rootName + '0'))
  const formula = CHORD_FORMULAS[quality]
  if (!formula) throw new Error(`Unknown chord quality: ${quality}`)
  return formula.map((semi) => (rootPc + semi) % 12)
}
