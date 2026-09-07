import { nameToMidi } from './notes'

/**
 * Strings are numbered the way guitarists say them: string 1 is the high E,
 * string 6 is the low E. `STRING_NUMBERS` is high-to-low so it maps directly
 * onto how a fretboard is drawn (string 1 on top).
 */
export const STRING_NUMBERS = [1, 2, 3, 4, 5, 6] as const
export type StringNumber = (typeof STRING_NUMBERS)[number]

/** Standard tuning, open-string MIDI notes keyed by string number. */
export const STANDARD_TUNING: Record<StringNumber, number> = {
  1: nameToMidi('E4'),
  2: nameToMidi('B3'),
  3: nameToMidi('G3'),
  4: nameToMidi('D3'),
  5: nameToMidi('A2'),
  6: nameToMidi('E2'),
}

export const STRING_LABELS: Record<StringNumber, string> = {
  1: 'e',
  2: 'B',
  3: 'G',
  4: 'D',
  5: 'A',
  6: 'E',
}

export const FRETS_ON_NECK = 22

export function fretToMidi(
  string: StringNumber,
  fret: number,
  tuning: Record<StringNumber, number> = STANDARD_TUNING,
): number {
  return tuning[string] + fret
}

export interface FretPosition {
  string: StringNumber
  fret: number
}

/**
 * Every place a given MIDI pitch can be played, lowest fret first.
 * `maxFret` bounds the search up the neck.
 */
export function midiToPositions(
  midi: number,
  maxFret = FRETS_ON_NECK,
  tuning: Record<StringNumber, number> = STANDARD_TUNING,
): FretPosition[] {
  const out: FretPosition[] = []
  for (const string of STRING_NUMBERS) {
    const fret = midi - tuning[string]
    if (fret >= 0 && fret <= maxFret) out.push({ string, fret })
  }
  return out
}
