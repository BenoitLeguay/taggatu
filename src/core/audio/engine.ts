import * as Tone from 'tone'
import { midiToFrequency } from '../music/notes'

/**
 * Thin wrapper around a shared Tone.js graph. Everything routes through one
 * master gain so the settings store can set a single volume. The audio context
 * starts suspended; call `unlockAudio()` from a user gesture before playback.
 */

let master: Tone.Gain | null = null
let pluck: Tone.PluckSynth | null = null
let click: Tone.MembraneSynth | null = null
let accentClick: Tone.MembraneSynth | null = null
let started = false

function graph() {
  if (master) {
    return {
      master,
      pluck: pluck!,
      click: click!,
      accentClick: accentClick!,
    }
  }

  master = new Tone.Gain(0.9).toDestination()

  pluck = new Tone.PluckSynth({
    attackNoise: 1.2,
    dampening: 3800,
    resonance: 0.94,
    release: 1.4,
  })
  const pluckGain = new Tone.Gain(0.9)
  pluck.connect(pluckGain)
  pluckGain.connect(master)

  click = new Tone.MembraneSynth({
    pitchDecay: 0.008,
    octaves: 4,
    envelope: { attack: 0.001, decay: 0.18, sustain: 0 },
  })
  click.volume.value = -6
  click.connect(master)

  accentClick = new Tone.MembraneSynth({
    pitchDecay: 0.008,
    octaves: 6,
    envelope: { attack: 0.001, decay: 0.22, sustain: 0 },
  })
  accentClick.volume.value = -2
  accentClick.connect(master)

  return { master, pluck, click, accentClick }
}

export async function unlockAudio(): Promise<void> {
  graph()
  if (!started) {
    await Tone.start()
    started = true
  }
}

export function isAudioUnlocked(): boolean {
  return started
}

/** 0..1 master volume. */
export function setMasterVolume(value: number): void {
  graph().master.gain.rampTo(Math.max(0, Math.min(1, value)), 0.05)
}

export function pluckMidi(midi: number, time?: number, _velocity = 0.9): void {
  const { pluck } = graph()
  // PluckSynth is monophonic; retrigger by unique frequency at the given time.
  pluck.triggerAttack(midiToFrequency(midi), time)
}

/**
 * Strum several notes as a chord. PluckSynth is monophonic, so each note gets a
 * short-lived voice that disposes itself once it has rung out.
 */
export function strumMidis(
  midis: number[],
  time?: number,
  spreadSeconds = 0.022,
): void {
  const { master } = graph()
  const base = time ?? Tone.now()
  midis.forEach((midi, i) => {
    const voice = new Tone.PluckSynth({
      attackNoise: 1,
      dampening: 4200,
      resonance: 0.96,
      release: 2,
    }).connect(master)
    voice.triggerAttack(midiToFrequency(midi), base + i * spreadSeconds)
    setTimeout(
      () => voice.dispose(),
      Math.max(0, (base - Tone.now() + 2.6) * 1000),
    )
  })
}

export function playClick(accent: boolean, time?: number): void {
  const { click, accentClick } = graph()
  if (accent) accentClick.triggerAttackRelease('C3', '16n', time)
  else click.triggerAttackRelease('C2', '32n', time)
}

export function getTransport() {
  return Tone.getTransport()
}

export const Draw = Tone.getDraw()
export { Tone }
