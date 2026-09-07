import { describe, expect, it } from 'vitest'
import {
  buildPlaybackPlan,
  collection,
  difficulty,
  exercises,
} from './arpeggios'

describe('giuliani arpeggio data', () => {
  it('has all 120 exercises, numbered 1..120', () => {
    expect(exercises).toHaveLength(120)
    expect(exercises.map((e) => e.id)).toEqual(
      Array.from({ length: 120 }, (_, i) => i + 1),
    )
  })

  it('every note is on a real string and a plausible fret', () => {
    for (const ex of exercises) {
      for (const m of ex.measures) {
        for (const n of m.notes) {
          expect(n.string).toBeGreaterThanOrEqual(1)
          expect(n.string).toBeLessThanOrEqual(6)
          expect(n.fret).toBeGreaterThanOrEqual(0)
          expect(n.fret).toBeLessThanOrEqual(19)
          expect(n.start).toBeGreaterThanOrEqual(0)
          expect(n.start).toBeLessThan(ex.timeSignature[0] + 1e-6)
          expect(n.dur).toBeGreaterThan(0)
        }
      }
    }
  })

  it('measures 1 and 2 carry the C and G7 shapes', () => {
    for (const ex of exercises) {
      expect(ex.measures[0].chord).toBe('C')
      expect(ex.measures[1].chord).toBe('G7')
      expect(ex.measures[0].notes.length).toBeGreaterThan(0)
      expect(ex.measures[1].notes.length).toBeGreaterThan(0)
    }
  })

  it('every bar has a named voicing and a shape drawn from its notes', () => {
    for (const ex of exercises) {
      for (const m of ex.measures.slice(0, 2)) {
        expect(m.name).toMatch(/^(C|G7)(\/[A-G]#?)?$/)
        // every fretted string in the shape is actually played in the bar
        for (const [s, fret] of Object.entries(m.shape)) {
          expect(
            m.notes.some((n) => String(n.string) === s && n.fret === fret),
          ).toBe(true)
        }
      }
      // Giuliani's classic second-bar voicing
      expect(exercises[0].measures[1].name).toBe('G7/B')
    }
  })

  it('builds a monotonic playback plan of the two arpeggio bars', () => {
    for (const ex of exercises) {
      const plan = buildPlaybackPlan(ex)
      expect(plan.totalBeats).toBe(8)
      expect(plan.events.length).toBeGreaterThan(0)
      for (let i = 1; i < plan.events.length; i++) {
        expect(plan.events[i].beat).toBeGreaterThanOrEqual(plan.events[i - 1].beat)
      }
      expect(plan.events.every((e) => e.midi > 30 && e.midi < 90)).toBe(true)
    }
  })

  it('difficulty is always within 1..5', () => {
    for (const ex of exercises) {
      const d = difficulty(ex)
      expect(d).toBeGreaterThanOrEqual(1)
      expect(d).toBeLessThanOrEqual(5)
    }
  })

  it('at most a handful of exercises need rhythm normalisation', () => {
    const flagged = exercises.filter((e) => e.flags.includes('rhythm-approx'))
    expect(flagged.length).toBeLessThanOrEqual(20)
  })

  it('collection metadata is present', () => {
    expect(collection.composer).toMatch(/giuliani/i)
  })
})
