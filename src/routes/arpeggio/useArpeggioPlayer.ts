import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getTransport,
  pluckMidi,
  strumMidis,
  Tone,
  unlockAudio,
} from '../../core/audio/engine'
import { Metronome } from '../../core/audio/metronome'
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
  /** Beat position inside the current loop (0..totalBeats), or null before the
   *  count-in finishes. */
  loopBeat: number | null
  countingIn: boolean
  totalBeats: number
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
  maxBpm: 180,
}

export function useArpeggioPlayer(exercise: Exercise): ArpPlayerState {
  const settings = useSettings()
  const [playing, setPlaying] = useState(false)
  const [bpm, setBpmState] = useState(76)
  const [loop, setLoop] = useState(true)
  const [loopCount, setLoopCount] = useState(0)
  const [loopBeat, setLoopBeat] = useState<number | null>(null)
  const [countingIn, setCountingIn] = useState(false)
  const [speed, setSpeedState] = useState<SpeedTrainer>(DEFAULT_SPEED)

  const partRef = useRef<Tone.Part<PlaybackEvent> | null>(null)
  const metroRef = useRef<Metronome | null>(null)
  const loopWatchRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const startedRef = useRef(false)
  const bpmRef = useRef(bpm)
  const speedRef = useRef(speed)
  const loopCountRef = useRef(0)

  useEffect(() => {
    bpmRef.current = bpm
  }, [bpm])
  useEffect(() => {
    speedRef.current = speed
  }, [speed])

  const plan = buildPlaybackPlan(exercise, { includeResolution: false })
  const planKey = exercise.id
  const countInBeats = settings.countIn ? plan.beatsPerMeasure : 0

  const teardown = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    if (!startedRef.current) return
    startedRef.current = false
    const t = getTransport()
    if (loopWatchRef.current !== null) {
      t.clear(loopWatchRef.current)
      loopWatchRef.current = null
    }
    partRef.current?.dispose()
    partRef.current = null
    metroRef.current?.dispose()
    metroRef.current = null
    t.stop()
    t.position = 0
    t.cancel()
  }, [])

  const stop = useCallback(() => {
    teardown()
    setPlaying(false)
    setCountingIn(false)
    setLoopBeat(null)
    setLoopCount(0)
    loopCountRef.current = 0
  }, [teardown])

  // stop when switching exercises
  useEffect(() => {
    return () => teardown()
  }, [planKey, teardown])

  const beatsPerMeasure = plan.beatsPerMeasure
  const beatsToBBS = useCallback(
    (beat: number) => {
      const bars = Math.floor(beat / beatsPerMeasure)
      const beats = Math.floor(beat % beatsPerMeasure)
      const sixteenths = (beat % 1) * 4
      return `${bars}:${beats}:${sixteenths}`
    },
    [beatsPerMeasure],
  )

  const start = useCallback(async () => {
    await unlockAudio()
    teardown()

    const t = getTransport()
    t.bpm.value = bpmRef.current

    const metro = new Metronome()
    metro.setBeatsPerBar(plan.beatsPerMeasure)
    metro.setAccentFirst(settings.accentFirstBeat)
    if (settings.metronomeEnabled) metro.enable()
    metroRef.current = metro

    const part = new Tone.Part(
      (time: number, ev: PlaybackEvent) => {
        if (settings.arpAudio) {
          pluckMidi(ev.midi, time, 0.55 + Math.min(ev.string, 6) * 0.03)
        }
      },
      [] as PlaybackEvent[],
    )
    for (const ev of plan.events) {
      part.add(beatsToBBS(countInBeats + ev.beat), ev)
    }
    part.loop = loop
    part.loopStart = beatsToBBS(countInBeats)
    part.loopEnd = beatsToBBS(countInBeats + plan.totalBeats)
    part.start(0)
    partRef.current = part

    // resolution chord + auto-stop when not looping
    if (!loop && exercise.resolution) {
      const chordMidis = exercise.resolution.notes.map((n) =>
        fretToMidi(n.string, n.fret),
      )
      t.scheduleOnce((time) => {
        strumMidis(chordMidis, time)
      }, beatsToBBS(countInBeats + plan.totalBeats))
      t.scheduleOnce(() => {
        Tone.getDraw().schedule(() => stop(), Tone.now())
      }, beatsToBBS(countInBeats + plan.totalBeats + plan.beatsPerMeasure))
    }

    // per-loop watcher for the speed trainer
    if (loop) {
      loopWatchRef.current = t.scheduleRepeat(
        () => {
          const n = loopCountRef.current + 1
          loopCountRef.current = n
          Tone.getDraw().schedule(() => setLoopCount(n), Tone.now())
          const sp = speedRef.current
          if (sp.enabled && n % sp.everyLoops === 0) {
            const next = Math.min(sp.maxBpm, bpmRef.current + sp.deltaBpm)
            if (next !== bpmRef.current) {
              bpmRef.current = next
              t.bpm.rampTo(next, 0.1)
              Tone.getDraw().schedule(() => setBpmState(next), Tone.now())
            }
          }
        },
        beatsToBBS(plan.totalBeats),
        beatsToBBS(countInBeats + plan.totalBeats),
      )
    }

    setCountingIn(countInBeats > 0)
    startedRef.current = true
    t.start()
    setPlaying(true)

    const tick = () => {
      const beatsElapsed = t.ticks / t.PPQ
      if (beatsElapsed < countInBeats) {
        setCountingIn(true)
        setLoopBeat(null)
      } else {
        setCountingIn(false)
        const rel = beatsElapsed - countInBeats
        setLoopBeat(
          loop ? ((rel % plan.totalBeats) + plan.totalBeats) % plan.totalBeats : rel,
        )
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [
    teardown,
    beatsToBBS,
    loop,
    countInBeats,
    plan,
    settings.accentFirstBeat,
    settings.metronomeEnabled,
    settings.arpAudio,
    exercise.resolution,
    stop,
  ])

  const togglePlay = useCallback(() => {
    if (playing) stop()
    else void start()
  }, [playing, start, stop])

  const setBpm = useCallback((next: number) => {
    const clamped = Math.max(30, Math.min(220, Math.round(next)))
    bpmRef.current = clamped
    setBpmState(clamped)
    getTransport().bpm.rampTo(clamped, 0.05)
  }, [])

  const setSpeed = useCallback((patch: Partial<SpeedTrainer>) => {
    setSpeedState((s) => ({ ...s, ...patch }))
  }, [])

  // react to metronome/accent toggles mid-play
  useEffect(() => {
    const metro = metroRef.current
    if (!metro) return
    metro.setAccentFirst(settings.accentFirstBeat)
    if (settings.metronomeEnabled) metro.enable()
    else metro.disable()
  }, [settings.metronomeEnabled, settings.accentFirstBeat])

  return {
    playing,
    bpm,
    loop,
    loopCount,
    loopBeat,
    countingIn,
    totalBeats: plan.totalBeats,
    events: plan.events,
    speed,
    setBpm,
    setLoop,
    setSpeed,
    togglePlay,
    stop,
  }
}
