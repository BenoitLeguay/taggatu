import * as Tone from 'tone'
import { midiToFrequency } from '../music/notes'

/**
 * Shared Tone.js graph. Guitar tone comes from a Sampler loaded with real
 * nylon-string samples (public/samples/guitar-nylon); the metronome is a pair
 * of synthesised clicks. Everything routes through one master gain.
 *
 * The audio context starts suspended — call `unlockAudio()` from a user gesture
 * before playback; it also resolves once the guitar samples have loaded.
 */

const SAMPLE_MAP: Record<string, string> = {
  E2: 'E2.mp3',
  'F#2': 'Fs2.mp3',
  A2: 'A2.mp3',
  B2: 'B2.mp3',
  'C#3': 'Cs3.mp3',
  D3: 'D3.mp3',
  E3: 'E3.mp3',
  'F#3': 'Fs3.mp3',
  G3: 'G3.mp3',
  A3: 'A3.mp3',
  B3: 'B3.mp3',
  'D#4': 'Ds4.mp3',
  E4: 'E4.mp3',
  'F#4': 'Fs4.mp3',
  A4: 'A4.mp3',
  B4: 'B4.mp3',
  D5: 'D5.mp3',
  E5: 'E5.mp3',
  G5: 'G5.mp3',
  A5: 'A5.mp3',
}

let master: Tone.Gain | null = null
let guitar: Tone.Sampler | null = null
let click: Tone.Synth | null = null
let accentClick: Tone.Synth | null = null
let subClick: Tone.Synth | null = null
let started = false
let sampleLoad: Promise<void> | null = null

// A quarter-second of genuine silence, looped forever on a plain HTML5
// <audio> element. iOS Safari mutes the Web Audio API (what Tone.js runs on)
// whenever the phone's hardware ring/silent switch is on, but it does NOT
// mute <audio>/<video> elements — and once ANY media element is playing, iOS
// switches the page's whole audio session to a category that ignores the
// switch, so Tone.js output starts being heard too. This has to be kept
// playing for the life of the page, and (re)started from a real user
// gesture, same as `Tone.start()`.
const SILENT_LOOP_WAV =
  'data:audio/wav;base64,UklGRvQHAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YdAHAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA=='

let silentLoopEl: HTMLAudioElement | null = null
let silentLoopArmed = false

function armSilentLoop(): void {
  if (typeof Audio === 'undefined') return
  if (!silentLoopEl) {
    silentLoopEl = new Audio(SILENT_LOOP_WAV)
    silentLoopEl.loop = true
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && silentLoopArmed) {
        void silentLoopEl?.play().catch(() => {})
      }
    })
  }
  silentLoopEl.play().then(
    () => {
      silentLoopArmed = true
    },
    () => {}, // ignore — will retry on the next unlockAudio() gesture
  )
}

function graph() {
  if (master) {
    return {
      master,
      guitar: guitar!,
      click: click!,
      accentClick: accentClick!,
      subClick: subClick!,
    }
  }

  master = new Tone.Gain(0.9).toDestination()

  let resolveLoad: () => void
  sampleLoad = new Promise((res) => {
    resolveLoad = res
  })
  guitar = new Tone.Sampler({
    urls: SAMPLE_MAP,
    baseUrl: `${import.meta.env.BASE_URL}samples/guitar-nylon/`,
    release: 1.1,
    curve: 'exponential',
    onload: () => resolveLoad(),
    onerror: () => resolveLoad(), // don't hang playback if a sample 404s
  })
  const body = new Tone.Gain(0.85)
  const warmth = new Tone.Filter({ type: 'lowpass', frequency: 6500, Q: 0.4 })
  guitar.chain(warmth, body, master)

  // A metronome click should read as a short, high, dry "tick" — not a
  // pitched note — so it stays clearly distinct from the plucked guitar and
  // cuts through even at low volume. A brief square-wave blip through a
  // highpass filter gives that woodblock-like tick; the accent is simply
  // higher-pitched and louder, the way a real metronome's downbeat click is.
  const clickFilter = new Tone.Filter({ type: 'highpass', frequency: 1200, Q: 0.5 })
  clickFilter.connect(master)
  click = new Tone.Synth({
    oscillator: { type: 'square' },
    envelope: { attack: 0.001, decay: 0.035, sustain: 0, release: 0.02 },
  })
  click.volume.value = -14
  click.connect(clickFilter)

  const accentFilter = new Tone.Filter({ type: 'highpass', frequency: 1200, Q: 0.5 })
  accentFilter.connect(master)
  accentClick = new Tone.Synth({
    oscillator: { type: 'square' },
    envelope: { attack: 0.001, decay: 0.045, sustain: 0, release: 0.02 },
  })
  accentClick.volume.value = -6
  accentClick.connect(accentFilter)

  // Beat subdivisions (eighths/sixteenths/triplets) reuse the same tick
  // timbre, just quieter and shorter, so they read as "in between" the main
  // click rather than a change of sound.
  subClick = new Tone.Synth({
    oscillator: { type: 'square' },
    envelope: { attack: 0.001, decay: 0.02, sustain: 0, release: 0.01 },
  })
  subClick.volume.value = -26
  subClick.connect(clickFilter)

  return { master, guitar, click, accentClick, subClick }
}

/**
 * Build the audio graph and kick off sample downloads WITHOUT resuming the
 * AudioContext (no user gesture needed). Call this early so the guitar samples
 * are decoded and ready before the first Play click.
 */
export function preloadAudio(): void {
  graph()
}

export function samplesReady(): boolean {
  return graph().guitar.loaded
}

export async function unlockAudio(): Promise<void> {
  graph()
  armSilentLoop()
  if (!started) {
    await Tone.start()
    started = true
  }
  // Wait for samples, but never block Play for more than a moment — if a few
  // opening notes are silent because a sample is still decoding, that's better
  // than a second of dead air. preloadAudio() on mount makes this rare.
  if (sampleLoad && !graph().guitar.loaded) {
    await Promise.race([
      sampleLoad,
      new Promise((r) => setTimeout(r, 500)),
    ])
  }
}

export function isAudioUnlocked(): boolean {
  return started
}

export function setMasterVolume(value: number): void {
  graph().master.gain.rampTo(Math.max(0, Math.min(1, value)), 0.05)
}

/** Pluck a single note. `time` is an AudioContext timestamp (defaults to now). */
export function pluckMidi(midi: number, time?: number, velocity = 0.9): void {
  const { guitar } = graph()
  guitar.triggerAttackRelease(
    midiToFrequency(midi),
    2.2,
    time ?? Tone.now(),
    Math.max(0.15, Math.min(1, velocity)),
  )
}

/** Strum a chord, low string to high, with a small roll. */
export function strumMidis(
  midis: number[],
  time?: number,
  spreadSeconds = 0.028,
): void {
  const { guitar } = graph()
  const base = time ?? Tone.now()
  const ordered = [...midis].sort((a, b) => a - b)
  ordered.forEach((midi, i) => {
    guitar.triggerAttackRelease(
      midiToFrequency(midi),
      3,
      base + i * spreadSeconds,
      0.8,
    )
  })
}

export function playClick(accent: boolean, time?: number): void {
  const { click, accentClick } = graph()
  const t = time ?? Tone.now()
  if (accent) accentClick.triggerAttackRelease('A6', 0.05, t)
  else click.triggerAttackRelease('A5', 0.04, t)
}

/** A quiet tick for a beat subdivision (eighth/sixteenth/triplet), not a beat itself. */
export function playSubClick(time?: number): void {
  const { subClick } = graph()
  subClick.triggerAttackRelease('A5', 0.025, time ?? Tone.now())
}

export function getTransport() {
  return Tone.getTransport()
}

export { Tone }
