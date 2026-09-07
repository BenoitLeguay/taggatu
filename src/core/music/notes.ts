/** Core pitch helpers. A "MIDI note" here is the standard integer where 69 = A4 = 440 Hz. */

export const NOTE_NAMES_SHARP = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const

export const NOTE_NAMES_FLAT = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'Gb',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
] as const

export type PitchClassName = (typeof NOTE_NAMES_SHARP)[number]

/** Pitch class 0-11 for a MIDI note (0 = C). */
export function pitchClass(midi: number): number {
  return ((midi % 12) + 12) % 12
}

export function octaveOf(midi: number): number {
  return Math.floor(midi / 12) - 1
}

export interface NoteNameOptions {
  flats?: boolean
  withOctave?: boolean
}

export function midiToName(midi: number, opts: NoteNameOptions = {}): string {
  const table = opts.flats ? NOTE_NAMES_FLAT : NOTE_NAMES_SHARP
  const name = table[pitchClass(midi)]
  return opts.withOctave ? `${name}${octaveOf(midi)}` : name
}

const NAME_TO_SEMITONE: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
}

/** Parse "C#4", "Eb3", "A4", "G#" (defaults to octave 4) into a MIDI number. */
export function nameToMidi(name: string): number {
  const match = /^([A-Ga-g])([#b]*)(-?\d+)?$/.exec(name.trim())
  if (!match) throw new Error(`Invalid note name: "${name}"`)
  const [, letter, accidentals, octaveRaw] = match
  let semitone = NAME_TO_SEMITONE[letter.toUpperCase()]
  for (const acc of accidentals) semitone += acc === '#' ? 1 : -1
  const octave = octaveRaw === undefined ? 4 : Number(octaveRaw)
  return semitone + (octave + 1) * 12
}

export function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}

export function frequencyToMidi(freq: number): number {
  return 69 + 12 * Math.log2(freq / 440)
}

/** Signed cents that `freq` is away from the nearest equal-tempered pitch. */
export function centsOff(freq: number): { midi: number; cents: number } {
  const exact = frequencyToMidi(freq)
  const midi = Math.round(exact)
  return { midi, cents: Math.round((exact - midi) * 100) }
}
