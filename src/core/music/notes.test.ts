import { describe, expect, it } from 'vitest'
import { midiToSolfege, nameToMidi } from './notes'

describe('midiToSolfege', () => {
  it('is fixed-do: the syllable always names the same pitch class, not "the tonic"', () => {
    // A (La) in any octave is always "La" — never "Do" just because some
    // exercise happens to be rooted there.
    expect(midiToSolfege(nameToMidi('A3'))).toBe('La')
    expect(midiToSolfege(nameToMidi('A4'))).toBe('La')
    expect(midiToSolfege(nameToMidi('C3'))).toBe('Do')
    expect(midiToSolfege(nameToMidi('C5'))).toBe('Do')
  })

  it('names every natural and sharped pitch class correctly', () => {
    const expected: Record<string, string> = {
      C4: 'Do',
      'C#4': 'Do#',
      D4: 'Re',
      'D#4': 'Re#',
      E4: 'Mi',
      F4: 'Fa',
      'F#4': 'Fa#',
      G4: 'Sol',
      'G#4': 'Sol#',
      A4: 'La',
      'A#4': 'La#',
      B4: 'Si',
    }
    for (const [name, solfege] of Object.entries(expected)) {
      expect(midiToSolfege(nameToMidi(name))).toBe(solfege)
    }
  })
})
