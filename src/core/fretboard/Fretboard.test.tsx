import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Fretboard } from './Fretboard'

function markerCircles() {
  const svg = screen.getByRole('img', { name: /fretboard diagram/i })
  // markers are drawn last, each as a <g> with pointer-events="none" wrapping
  // a <circle>; grab those circles specifically (skip fret-wire/inlay circles).
  return Array.from(svg.querySelectorAll('g[pointer-events="none"] > circle'))
}

describe('Fretboard', () => {
  it('places markers with the original landscape geometry (regression lock)', () => {
    render(
      <Fretboard
        fromFret={0}
        toFret={5}
        height={180}
        markers={[
          { string: 1, fret: 0 },
          { string: 6, fret: 3 },
        ]}
      />,
    )
    const [open, fretted] = markerCircles()
    expect(Number(open.getAttribute('cx'))).toBeCloseTo(18) // openAlong
    expect(Number(open.getAttribute('cy'))).toBeCloseTo(14) // string 1
    expect(Number(fretted.getAttribute('cx'))).toBeCloseTo(321)
    expect(Number(fretted.getAttribute('cy'))).toBeCloseTo(154) // string 6
  })

  it('mirrors strings in vertical mode: string 6 lands left, string 1 lands right', () => {
    render(
      <Fretboard
        fromFret={0}
        toFret={5}
        height={180}
        vertical
        markers={[
          { string: 1, fret: 0 },
          { string: 6, fret: 3 },
        ]}
      />,
    )
    const [stringOne, stringSix] = markerCircles()
    const x1 = Number(stringOne.getAttribute('cx'))
    const x6 = Number(stringSix.getAttribute('cx'))
    expect(x6).toBeLessThan(x1)
    // nut-to-frets progression now runs top-to-bottom (y), not left-to-right (x)
    expect(Number(stringOne.getAttribute('cy'))).toBeLessThan(
      Number(stringSix.getAttribute('cy')),
    )
  })

  it('draws fret wires as vertical lines in landscape and horizontal lines in portrait', () => {
    const { container, rerender } = render(<Fretboard fromFret={0} toFret={5} height={180} />)
    const wireH = container.querySelector('svg > line')!
    expect(wireH.getAttribute('x1')).toBe(wireH.getAttribute('x2')) // vertical wire
    expect(wireH.getAttribute('y1')).not.toBe(wireH.getAttribute('y2'))

    rerender(<Fretboard fromFret={0} toFret={5} height={180} vertical />)
    const wireV = container.querySelector('svg > line')!
    expect(wireV.getAttribute('y1')).toBe(wireV.getAttribute('y2')) // horizontal wire
    expect(wireV.getAttribute('x1')).not.toBe(wireV.getAttribute('x2'))
  })
})
