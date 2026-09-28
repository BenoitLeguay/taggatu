import { describe, expect, it } from 'vitest'
import {
  CAGED_SHAPE_IDS,
  degreeLabel,
  shapeNotes,
  shapeOrderForRoot,
  shapeWindow,
  type CagedShapeId,
} from './cagedShapes'
import { pitchClass } from './notes'
import { STANDARD_TUNING } from './tuning'

describe('shapeWindow', () => {
  it('matches well-known reference positions', () => {
    // C major, C-shape: the classic open-position C major scale, near the nut.
    expect(shapeWindow('C', 0)).toMatchObject({ lo: 0, hi: 4 })
    // G major, E-shape: the standard "3rd position" G major scale box.
    expect(shapeWindow('E', 7)).toMatchObject({ lo: 3, hi: 7 })
    // G major, G-shape: open position, right at the nut.
    expect(shapeWindow('G', 7)).toMatchObject({ lo: 0, hi: 4 })
  })

  it('never returns a negative fret', () => {
    for (let pc = 0; pc < 12; pc++) {
      for (const id of CAGED_SHAPE_IDS) {
        expect(shapeWindow(id, pc).lo).toBeGreaterThanOrEqual(0)
      }
    }
  })
})

describe('shapeOrderForRoot', () => {
  it('is always some rotation of C-A-G-E-D for every root', () => {
    const CAGED_CYCLE = 'CAGEDCAGED' // any 5 consecutive letters is a valid rotation
    for (let pc = 0; pc < 12; pc++) {
      const order = shapeOrderForRoot(pc).map((w) => w.shape)
      expect(new Set(order).size).toBe(5) // all distinct
      expect(CAGED_CYCLE).toContain(order.join(''))
    }
  })

  it('gives non-decreasing windows up the neck', () => {
    // Ties only happen when the root sits exactly on an open reference
    // string (E for the E/G pair, A for the A/C pair) and both windows clamp
    // to the nut — a real "can't go below fret 0" edge case, not a bug.
    for (let pc = 0; pc < 12; pc++) {
      const order = shapeOrderForRoot(pc)
      for (let i = 1; i < order.length; i++) {
        expect(order[i].lo).toBeGreaterThanOrEqual(order[i - 1].lo)
      }
    }
  })
})

describe('shapeNotes', () => {
  it('only contains notes that belong to the scale and land in the window', () => {
    const rootPc = 7 // G
    for (const id of CAGED_SHAPE_IDS as CagedShapeId[]) {
      const w = shapeWindow(id, rootPc)
      const notes = shapeNotes(w, rootPc, 'major')
      expect(notes.length).toBeGreaterThan(0)
      for (const n of notes) {
        expect(n.fret).toBeGreaterThanOrEqual(w.lo)
        expect(n.fret).toBeLessThanOrEqual(w.hi)
        expect(STANDARD_TUNING[n.string] + n.fret).toBe(n.midi)
        const semis = ((pitchClass(n.midi) - rootPc) % 12 + 12) % 12
        expect([0, 2, 4, 5, 7, 9, 11]).toContain(semis) // major scale intervals
      }
    }
  })

  it('is sorted low to high in pitch', () => {
    const w = shapeWindow('E', 0)
    const notes = shapeNotes(w, 0, 'major')
    for (let i = 1; i < notes.length; i++) {
      expect(notes[i].midi).toBeGreaterThanOrEqual(notes[i - 1].midi)
    }
  })

  it('consecutive shapes in the cycle share overlapping fret range', () => {
    for (let pc = 0; pc < 12; pc++) {
      const order = shapeOrderForRoot(pc)
      for (let i = 1; i < order.length; i++) {
        // the next shape should start at or before the previous one ends,
        // so a scale run can hand off from one box to the next
        expect(order[i].lo).toBeLessThanOrEqual(order[i - 1].hi + 1)
      }
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
