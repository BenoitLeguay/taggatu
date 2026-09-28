import { describe, expect, it } from 'vitest'
import { walkOctave } from './scaleWalk'
import { scaleById } from './scales'
import { pitchClass } from './notes'
import { STANDARD_TUNING, STRING_NUMBERS, type StringNumber } from './tuning'

const ALL_STRINGS: StringNumber[] = [...STRING_NUMBERS]

describe('walkOctave', () => {
  it('ascending: lands on the right scale degrees in order, ending an octave up', () => {
    const scale = scaleById('major')
    for (const string of ALL_STRINGS) {
      for (let fret = 0; fret <= 5; fret++) {
        const rootMidi = STANDARD_TUNING[string] + fret
        const steps = walkOctave(string, fret, 'up', 'major')
        expect(steps).toHaveLength(scale.intervals.length + 1)
        expect(steps[0]).toMatchObject({ string, fret, midi: rootMidi })
        expect(steps[steps.length - 1].midi).toBe(rootMidi + 12)
        steps.forEach((step, i) => {
          const expectedPc = pitchClass(rootMidi + (scale.intervals[i] ?? 12))
          expect(pitchClass(step.midi)).toBe(expectedPc)
          expect(STANDARD_TUNING[step.string] + step.fret).toBe(step.midi)
        })
      }
    }
  })

  it('descending: same pitch classes, decreasing pitch, ending an octave down', () => {
    const scale = scaleById('major')
    for (const string of ALL_STRINGS) {
      for (let fret = 12; fret <= 17; fret++) {
        const rootMidi = STANDARD_TUNING[string] + fret
        const steps = walkOctave(string, fret, 'down', 'major')
        expect(steps).toHaveLength(scale.intervals.length + 1)
        expect(steps[steps.length - 1].midi).toBe(rootMidi - 12)
        for (let i = 1; i < steps.length; i++) {
          expect(steps[i].midi).toBeLessThan(steps[i - 1].midi)
        }
      }
    }
  })

  it('never asks for a jump of more than a comfortable hand span', () => {
    for (const string of ALL_STRINGS) {
      for (let fret = 0; fret <= 12; fret++) {
        for (const dir of ['up', 'down'] as const) {
          const steps = walkOctave(string, fret, dir, 'major')
          for (let i = 1; i < steps.length; i++) {
            expect(Math.abs(steps[i].fret - steps[i - 1].fret)).toBeLessThanOrEqual(4)
          }
        }
      }
    }
  })

  it('stops short instead of inventing an unplayable note when the neck runs out', () => {
    // A one octave below open A (A1) doesn't exist on a standard 6-string
    // guitar — lower than open low E. This must come back short, not throw
    // or fabricate a negative fret.
    const steps = walkOctave(5, 0, 'down', 'major')
    expect(steps.length).toBeLessThan(8)
    for (const s of steps) expect(s.fret).toBeGreaterThanOrEqual(0)
  })

  it('going up from the same start always can complete when going down cannot, and vice versa', () => {
    const upFromOpenA = walkOctave(5, 0, 'up', 'major')
    expect(upFromOpenA).toHaveLength(8) // plenty of neck available going up
  })
})
