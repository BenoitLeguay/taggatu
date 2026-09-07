import { getTransport, playClick, Tone } from './engine'

/**
 * Transport-synced metronome. It does not own tempo or start/stop of the
 * Transport itself — the arpeggio player (or any host) drives that — it just
 * schedules clicks on the beat while enabled.
 */
export class Metronome {
  private eventId: number | null = null
  private _enabled = false
  private _accentFirst = true
  private beatsPerBar = 4
  private onBeat?: (beatInBar: number, time: number) => void

  get enabled(): boolean {
    return this._enabled
  }

  setBeatsPerBar(n: number): void {
    this.beatsPerBar = Math.max(1, Math.round(n))
  }

  setAccentFirst(accent: boolean): void {
    this._accentFirst = accent
  }

  setBeatListener(fn?: (beatInBar: number, time: number) => void): void {
    this.onBeat = fn
  }

  enable(): void {
    if (this._enabled) return
    this._enabled = true
    const transport = getTransport()
    this.eventId = transport.scheduleRepeat((time) => {
      const beat = Math.round(transport.ticks / Tone.Ticks('4n').valueOf())
      const beatInBar = ((beat % this.beatsPerBar) + this.beatsPerBar) % this.beatsPerBar
      playClick(this._accentFirst && beatInBar === 0, time)
      this.onBeat?.(beatInBar, time)
    }, '4n')
  }

  disable(): void {
    if (this.eventId !== null) {
      getTransport().clear(this.eventId)
      this.eventId = null
    }
    this._enabled = false
  }

  dispose(): void {
    this.disable()
    this.onBeat = undefined
  }
}
