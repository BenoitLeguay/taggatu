import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { Home } from '../routes/Home'
import ArpeggioTrainer from '../routes/arpeggio/ArpeggioTrainer'
import FretboardTrainer from '../routes/FretboardTrainer'
import EarTrainer from '../routes/EarTrainer'
import RhythmTrainer from '../routes/RhythmTrainer'
import PitchTrainer from '../routes/PitchTrainer'

beforeAll(() => {
  // jsdom has no Web Audio; components only touch it on user interaction, but
  // guard anyway so a stray call doesn't blow up a render.
  class FakeAudioContext {
    createAnalyser() {
      return { fftSize: 2048, connect() {}, getFloatTimeDomainData() {} }
    }
    createMediaStreamSource() {
      return { connect() {} }
    }
    close() {
      return Promise.resolve()
    }
  }
  vi.stubGlobal('AudioContext', FakeAudioContext)
})

const wrap = (ui: React.ReactNode) => (
  <MemoryRouter>{ui}</MemoryRouter>
)

describe('route smoke tests', () => {
  it('Home lists the five trainers', () => {
    render(wrap(<Home />))
    expect(screen.getByText('Arpeggio Trainer')).toBeInTheDocument()
    expect(screen.getByText('Ear Training')).toBeInTheDocument()
    expect(screen.getAllByRole('link').length).toBeGreaterThanOrEqual(5)
  })

  it('ArpeggioTrainer renders the first study and the highway', () => {
    render(wrap(<ArpeggioTrainer />))
    expect(screen.getByText(/Giuliani No\. 1/)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /scrolling fretboard/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument()
  })

  it('FretboardTrainer renders a fretboard and a prompt', () => {
    render(wrap(<FretboardTrainer />))
    expect(screen.getByRole('img', { name: /fretboard/i })).toBeInTheDocument()
    expect(screen.getByText(/Fretboard Trainer/)).toBeInTheDocument()
  })

  it('EarTrainer renders choices', () => {
    render(wrap(<EarTrainer />))
    expect(screen.getByRole('button', { name: /replay/i })).toBeInTheDocument()
  })

  it('RhythmTrainer renders the slot grid', () => {
    render(wrap(<RhythmTrainer />))
    expect(screen.getByText(/Rhythm Trainer/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument()
  })

  it('PitchTrainer asks for the mic first', () => {
    render(wrap(<PitchTrainer />))
    expect(
      screen.getByRole('button', { name: /enable microphone/i }),
    ).toBeInTheDocument()
  })
})
