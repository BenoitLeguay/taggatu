import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  pluckMidi,
  playClick,
  strumMidis,
  Tone,
  unlockAudio,
} from '../../core/audio/engine'
import { fretToMidi } from '../../core/music/tuning'
import { useSettings } from '../../store/settings'
import {
  buildPlaybackPlan,
  type Exercise,
  type PlaybackEvent,
} from '../../data/arpeggios'

export interface SpeedTrainer {
  enabled: boolean
  deltaBpm: number
  everyLoops: number
  maxBpm: number
}

export interface ArpPlayerState {
  playing: boolean
  bpm: number
  loop: boolean
  loopCount: number
  /** Beat inside the current loop (0..totalBeats), or null during count-in. */
  loopBeat: number | null
  countInBeatsLeft: number | null
  totalBeats: number
  beatsPerMeasure: number
  events: PlaybackEvent[]
  speed: SpeedTrainer
  setBpm: (bpm: number) => void
  setLoop: (loop: boolean) => void
  setSpeed: (patch: Partial<SpeedTrainer>) => void
  togglePlay: () => void
  stop: () => void
}

const DEFAULT_SPEED: SpeedTrainer = {
  enabled: false,
  deltaBpm: 4,
  everyLoops: 2,
  maxBpm: 168,
}
const LOOKAHEAD_SEC = 0.12
const MIN_BPM = 30
const MAX_BPM = 220

/**
 * Drives audio and the scrolling visual from ONE clock: a rAF loop integrates
 * elapsed beats from `performance.now()` and the live tempo, schedules note and
 * click audio a short time ahead (the "two clocks" pattern), and reports the
 * playhead beat for the highway. Because both come from the same integrator the
 * dots always line up with what you hear, at any tempo, through tempo changes.
 */
export function useArpeggioPlayer(exercise: Exercise): ArpPlayerState {
  const settings = useSettings()
  const [playing, setPlaying] = useState(false)
  const [bpm, setBpmState] = useState(76)
  const [loop, setLoop] = useState(true)
  const [loopCount, setLoopCount] = useState(0)
  const [loopBeat, setLoopBeat] = useState<number | null>(null)
  const [countInBeatsLeft, setCountInBeatsLeft] = useState<number | null>(null)
  const [speed, setSpeedState] = useState<SpeedTrainer>(DEFAULT_SPEED)

  const plan = useMemo(
    () => buildPlaybackPlan(exercise, { includeResolution: false }),
    [exercise],
  )
  const { totalBeats, beatsPerMeasure } = plan

  const rafRef = useRef<number | null>(null)
  const frameRef = useRef<() => void>(() => {})
  const runningRef = useRef(false)
  const lastFrameMsRef = useRef(0)
  const elapsedBeatsRef = useRef(0)
  const scheduledToBeatRef = useRef(0)
  const audioAnchorRef = useRef(0)
  const beatAnchorRef = useRef(0)
  const loopCountRef = useRef(0)

  const bpmRef = useRef(bpm)
  const loopRef = useRef(loop)
  const speedRef = useRef(speed)
  const settingsRef = useRef(settings)
  useEffect(() => {
    bpmRef.current = bpm
  }, [bpm])
  useEffect(() => {
    loopRef.current = loop
  }, [loop])
  useEffect(() => {
    speedRef.current = speed
  }, [speed])
  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  const countInBeats = settings.countIn ? beatsPerMeasure : 0

  const stop = useCallback(() => {
    runningRef.current = false
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    setPlaying(false)
    setLoopBeat(null)
    setCountInBeatsLeft(null)
    setLoopCount(0)
    loopCountRef.current = 0
  }, [])

  // stop playback if the loaded exercise changes out from under us (e.g. via a
  // back/forward navigation that doesn't go through the list) and on unmount.
  useEffect(() => {
    return () => stop()
  }, [exercise.id, stop])

  const audioTimeForBeat = (beat: number) => {
    const secPerBeat = 60 / bpmRef.current
    return audioAnchorRef.current + (beat - beatAnchorRef.current) * secPerBeat
  }

  const reanchor = useCallback(() => {
    audioAnchorRef.current = Tone.now() + 0.02
    beatAnchorRef.current = elapsedBeatsRef.current
    scheduledToBeatRef.current = elapsedBeatsRef.current
  }, [])

  const frame = useCallback(() => {
    if (!runningRef.current) return
    const nowMs = performance.now()
    const dt = Math.min(0.1, (nowMs - lastFrameMsRef.current) / 1000)
    lastFrameMsRef.current = nowMs

    const secPerBeat = 60 / bpmRef.current
    elapsedBeatsRef.current += dt / secPerBeat
    const elapsed = elapsedBeatsRef.current
    const playBeat = elapsed - countInBeats

    // schedule the window [scheduledToBeat, elapsed + lookahead)
    const lookaheadBeats = LOOKAHEAD_SEC / secPerBeat
    const windowEnd = elapsed + lookaheadBeats
    const from = scheduledToBeatRef.current
    const s = settingsRef.current

    // metronome clicks on every integer beat
    for (let b = Math.ceil(from - 1e-6); b < windowEnd; b++) {
      if (b < from) continue
      if (s.metronomeEnabled) {
        const rel = b - countInBeats
        const accent =
          s.accentFirstBeat &&
          (rel >= 0
            ? ((rel % beatsPerMeasure) + beatsPerMeasure) % beatsPerMeasure === 0
            : ((b % beatsPerMeasure) + beatsPerMeasure) % beatsPerMeasure === 0)
        playClick(accent, Math.max(Tone.now(), audioTimeForBeat(b)))
      }
    }

    // note events (only after the count-in)
    if (windowEnd > countInBeats) {
      const loopLen = totalBeats
      const startLoopK = Math.max(0, Math.floor((from - countInBeats) / loopLen))
      const endLoopK = loopRef.current
        ? Math.floor((windowEnd - countInBeats) / loopLen)
        : 0
      for (let k = startLoopK; k <= endLoopK; k++) {
        for (const ev of plan.events) {
          const absBeat = countInBeats + k * loopLen + ev.beat
          if (absBeat >= from && absBeat < windowEnd && absBeat >= countInBeats) {
            if (s.arpAudio) {
              pluckMidi(
                ev.midi,
                Math.max(Tone.now(), audioTimeForBeat(absBeat)),
                0.6 + (6 - ev.string) * 0.03,
              )
            }
          }
        }
        if (!loopRef.current) break
      }
    }
    scheduledToBeatRef.current = windowEnd

    // loop bookkeeping + speed trainer
    if (playBeat >= 0 && loopRef.current) {
      const k = Math.floor(playBeat / totalBeats)
      if (k > loopCountRef.current) {
        loopCountRef.current = k
        setLoopCount(k)
        const sp = speedRef.current
        if (sp.enabled && k % sp.everyLoops === 0) {
          const next = Math.min(sp.maxBpm, bpmRef.current + sp.deltaBpm)
          if (next !== bpmRef.current) {
            bpmRef.current = next
            reanchor()
            setBpmState(next)
          }
        }
      }
    }

    // visual playhead
    if (playBeat < 0) {
      setCountInBeatsLeft(Math.ceil(-playBeat))
      setLoopBeat(null)
    } else {
      setCountInBeatsLeft(null)
      const pos = loopRef.current
        ? ((playBeat % totalBeats) + totalBeats) % totalBeats
        : playBeat
      setLoopBeat(pos)
      if (!loopRef.current && playBeat >= totalBeats) {
        // play the resolution chord once, then stop
        if (exercise.resolution) {
          strumMidis(
            exercise.resolution.notes.map((n) => fretToMidi(n.string, n.fret)),
            Tone.now() + 0.02,
          )
        }
        stop()
        return
      }
    }

    rafRef.current = requestAnimationFrame(() => frameRef.current())
  }, [
    countInBeats,
    totalBeats,
    beatsPerMeasure,
    plan.events,
    reanchor,
    stop,
    exercise.resolution,
  ])

  useEffect(() => {
    frameRef.current = frame
  }, [frame])

  const start = useCallback(async () => {
    await unlockAudio()
    runningRef.current = true
    elapsedBeatsRef.current = 0
    scheduledToBeatRef.current = 0
    loopCountRef.current = 0
    lastFrameMsRef.current = performance.now()
    audioAnchorRef.current = Tone.now() + 0.05
    beatAnchorRef.current = 0
    setLoopCount(0)
    setPlaying(true)
    setCountInBeatsLeft(countInBeats > 0 ? countInBeats : null)
    rafRef.current = requestAnimationFrame(() => frameRef.current())
  }, [countInBeats])

  const togglePlay = useCallback(() => {
    if (runningRef.current) stop()
    else void start()
  }, [start, stop])

  const setBpm = useCallback(
    (next: number) => {
      const clamped = Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(next)))
      bpmRef.current = clamped
      setBpmState(clamped)
      if (runningRef.current) reanchor()
    },
    [reanchor],
  )

  const setSpeed = useCallback((patch: Partial<SpeedTrainer>) => {
    setSpeedState((s) => ({ ...s, ...patch }))
  }, [])

  return {
    playing,
    bpm,
    loop,
    loopCount,
    loopBeat,
    countInBeatsLeft,
    totalBeats,
    beatsPerMeasure,
    events: plan.events,
    speed,
    setBpm,
    setLoop,
    setSpeed,
    togglePlay,
    stop,
  }
}
