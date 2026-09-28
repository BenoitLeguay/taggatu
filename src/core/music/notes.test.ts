import { describe, expect, it } from 'vitest'
import { degreeLabel, midiToSolfege, nameToMidi } from './notes'

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

describe('degreeLabel', () => {
  it('names every semitone distance from the root', () => {
    expect(degreeLabel(0)).toBe('1')
    expect(degreeLabel(1)).toBe('2b')
    expect(degreeLabel(2)).toBe('2')
    expect(degreeLabel(3)).toBe('3b')
    expect(degreeLabel(4)).toBe('3')
    expect(degreeLabel(5)).toBe('4')
    expect(degreeLabel(7)).toBe('5')
    expect(degreeLabel(9)).toBe('6')
    expect(degreeLabel(11)).toBe('7')
    expect(degreeLabel(12)).toBe('1') // octave collapses back to the root
  })
})
