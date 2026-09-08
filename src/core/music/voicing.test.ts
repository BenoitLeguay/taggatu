import { describe, expect, it } from 'vitest'
import { findChordVoicings } from './voicing'
import { CHORD_FORMULAS } from './chords'
import { pitchClass } from './notes'
import { STANDARD_TUNING, STRING_NUMBERS } from './tuning'

/** "x,3,2,0,1,0"-style string, low string (6) to high string (1). */
function shapeString(frets: Record<number, number | null>): string {
  return [...STRING_NUMBERS]
    .reverse()
    .map((s) => (frets[s] == null ? 'x' : frets[s]))
    .join(',')
}

describe('findChordVoicings', () => {
  it('reconstructs the standard open-position major/minor shapes', () => {
    // pitch classes: C=0, D=2, E=4, G=7, A=9
    expect(shapeString(findChordVoicings(4, 'maj')[0].frets)).toBe('0,2,2,1,0,0') // E
    expect(shapeString(findChordVoicings(9, 'maj')[0].frets)).toBe('x,0,2,2,2,0') // A
    expect(shapeString(findChordVoicings(0, 'maj')[0].frets)).toBe('x,3,2,0,1,0') // C
    expect(shapeString(findChordVoicings(7, 'maj')[0].frets)).toBe('3,2,0,0,0,3') // G
    expect(shapeString(findChordVoicings(2, 'maj')[0].frets)).toBe('x,x,0,2,3,2') // D
    expect(shapeString(findChordVoicings(9, 'min')[0].frets)).toBe('x,0,2,2,1,0') // Am
  })

  it('only ever plays chord tones, and always includes the root', () => {
    for (let root = 0; root < 12; root++) {
      for (const quality of Object.keys(CHORD_FORMULAS)) {
        const tones = new Set(
          CHORD_FORMULAS[quality].map((semi) => (root + semi) % 12),
        )
        for (const v of findChordVoicings(root, quality)) {
          const soundingPcs = STRING_NUMBERS.filter((s) => v.frets[s] != null).map(
            (s) => pitchClass(STANDARD_TUNING[s] + (v.frets[s] as number)),
          )
          for (const pc of soundingPcs) expect(tones.has(pc)).toBe(true)
          expect(soundingPcs).toContain(root)
        }
      }
    }
  })

  it('returns strictly ascending, distinct positions up the neck', () => {
    const voicings = findChordVoicings(4, 'maj') // E major
    const positions = voicings.map((v) => v.positionFret)
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1])
    }
  })
})
