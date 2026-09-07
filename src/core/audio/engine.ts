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
let click: Tone.MembraneSynth | null = null
let accentClick: Tone.MembraneSynth | null = null
let started = false
let sampleLoad: Promise<void> | null = null

function graph() {
  if (master) {
    return { master, guitar: guitar!, click: click!, accentClick: accentClick! }
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

  click = new Tone.MembraneSynth({
    pitchDecay: 0.008,
    octaves: 4,
    envelope: { attack: 0.001, decay: 0.16, sustain: 0 },
  })
  click.volume.value = -9
  click.connect(master)

  accentClick = new Tone.MembraneSynth({
    pitchDecay: 0.006,
    octaves: 6,
    envelope: { attack: 0.001, decay: 0.2, sustain: 0 },
  })
  accentClick.volume.value = -4
  accentClick.connect(master)

  return { master, guitar, click, accentClick }
}

export async function unlockAudio(): Promise<void> {
  graph()
  if (!started) {
    await Tone.start()
    started = true
  }
  if (sampleLoad) await sampleLoad
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
  if (accent) accentClick.triggerAttackRelease('C3', '16n', t)
  else click.triggerAttackRelease('C2', '32n', t)
}

export function getTransport() {
  return Tone.getTransport()
}

export { Tone }
