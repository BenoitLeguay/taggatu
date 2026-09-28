import { describe, expect, it } from 'vitest'
import { generateScalePaths } from './scaleFingering'
import { scaleById } from './scales'
import { pitchClass } from './notes'
import { STANDARD_TUNING, STRING_NUMBERS, type StringNumber } from './tuning'

const ALL_STRINGS: StringNumber[] = [...STRING_NUMBERS]

describe('generateScalePaths', () => {
  it('every path plays the right scale degrees in order, starting and ending on the root', () => {
    const scale = scaleById('major')
    for (const string of ALL_STRINGS) {
      for (let fret = 0; fret <= 5; fret++) {
        const rootMidi = STANDARD_TUNING[string] + fret
        for (const path of generateScalePaths(string, fret, 'major')) {
          expect(path).toHaveLength(scale.intervals.length + 1)
          expect(path[0]).toMatchObject({ string, fret, midi: rootMidi })
          expect(path[path.length - 1].midi).toBe(rootMidi + 12)
          path.forEach((step, i) => {
            const expectedPc =
              i === path.length - 1
                ? pitchClass(rootMidi)
                : pitchClass(rootMidi + scale.intervals[i])
            expect(pitchClass(step.midi)).toBe(expectedPc)
            expect(STANDARD_TUNING[step.string] + step.fret).toBe(step.midi)
          })
        }
      }
    }
  })

  it('never asks for a jump of more than a comfortable hand span between notes', () => {
    for (const string of ALL_STRINGS) {
      for (let fret = 0; fret <= 9; fret++) {
        for (const path of generateScalePaths(string, fret, 'major')) {
          for (let i = 1; i < path.length; i++) {
            expect(Math.abs(path[i].fret - path[i - 1].fret)).toBeLessThanOrEqual(5)
          }
        }
      }
    }
  })

  it('finds more than one fingering for at least some starting notes (the "all possible ways" case)', () => {
    const branchingStarts = ALL_STRINGS.some((string) =>
      Array.from({ length: 6 }, (_, fret) => fret).some(
        (fret) => generateScalePaths(string, fret, 'major').length > 1,
      ),
    )
    expect(branchingStarts).toBe(true)
  })

  it('every path within a start is a distinct fingering', () => {
    for (const string of ALL_STRINGS) {
      for (let fret = 0; fret <= 5; fret++) {
        const paths = generateScalePaths(string, fret, 'major')
        const keys = paths.map((p) => p.map((s) => `${s.string}/${s.fret}`).join(','))
        expect(new Set(keys).size).toBe(keys.length)
      }
    }
  })
})
