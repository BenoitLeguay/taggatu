import { useCallback, useEffect, useRef, useState } from 'react'
import { playClick, playSubClick, Tone, unlockAudio } from '../core/audio/engine'
import { MetronomeVisual, type BeatState } from '../components/MetronomeVisual'
import { Segmented } from '../components/ui/Segmented'
import { Toggle } from '../components/ui/Toggle'

const MIN_BPM = 30
const MAX_BPM = 300
const LOOKAHEAD_SEC = 0.12
const TAP_TIMEOUT_MS = 2500
const MIN_TIMER_MIN = 1
const MAX_TIMER_MIN = 60

type TimeSignature = '2/4' | '3/4' | '4/4' | '6/8'
const SIGNATURES: TimeSignature[] = ['2/4', '3/4', '4/4', '6/8']
const SIGNATURE_BEATS: Record<TimeSignature, number> = {
  '2/4': 2,
  '3/4': 3,
  '4/4': 4,
  '6/8': 6,
}

type Subdivision = 'quarter' | 'eighth' | 'sixteenth' | 'triplet'
const SUBDIVISIONS: { value: Subdivision; label: string }[] = [
  { value: 'quarter', label: 'Quarter' },
  { value: 'eighth', label: 'Eighth' },
  { value: 'sixteenth', label: '16th' },
  { value: 'triplet', label: 'Triplet' },
]
/** How many clicks per beat, including the beat itself. */
const SUBDIVISION_COUNT: Record<Subdivision, number> = {
  quarter: 1,
  eighth: 2,
  sixteenth: 4,
  triplet: 3,
}

interface SpeedTrainer {
  enabled: boolean
  deltaBpm: number
  everyMeasures: number
  maxBpm: number
}
const DEFAULT_SPEED: SpeedTrainer = {
  enabled: false,
  deltaBpm: 4,
  everyMeasures: 4,
  maxBpm: 200,
}

const CYCLE: BeatState[] = ['accent', 'normal', 'off']
function nextBeatState(s: BeatState): BeatState {
  return CYCLE[(CYCLE.indexOf(s) + 1) % CYCLE.length]
}
function defaultBeatStates(count: number): BeatState[] {
  return Array.from({ length: count }, (_, i) => (i === 0 ? 'accent' : 'normal'))
}

/**
 * Same "rAF integrates elapsed beats, schedule audio a lookahead window
 * ahead" clock as the arpeggio player, minus notes/looping — just a steady
 * click driven by one clock so the flashing dot never drifts from the sound.
 * Each beat in the measure carries its own state (accent / normal / off) so
 * muting or accenting a specific beat doesn't need a separate code path.
 */
function useMetronome() {
  const [playing, setPlaying] = useState(false)
  const [bpm, setBpmState] = useState(100)
  const [signature, setSignatureState] = useState<TimeSignature>('4/4')
  const [beatStates, setBeatStates] = useState<BeatState[]>(() =>
    defaultBeatStates(SIGNATURE_BEATS['4/4']),
  )
  const [beatPos, setBeatPos] = useState<number | null>(null)
  const [subdivision, setSubdivisionState] = useState<Subdivision>('quarter')
  const [measureCount, setMeasureCount] = useState(0)
  const [speed, setSpeedState] = useState<SpeedTrainer>(DEFAULT_SPEED)
  const [timerEnabled, setTimerEnabled] = useState(false)
  const [timerMinutes, setTimerMinutes] = useState(10)

  const rafRef = useRef<number | null>(null)
  const frameRef = useRef<() => void>(() => {})
  const runningRef = useRef(false)
  const lastFrameMsRef = useRef(0)
  const elapsedBeatsRef = useRef(0)
  const scheduledToBeatRef = useRef(0)
  const audioAnchorRef = useRef(0)
  const beatAnchorRef = useRef(0)
  const measureCountRef = useRef(0)
  const timeoutRef = useRef<number | null>(null)

  const bpmRef = useRef(bpm)
  const beatStatesRef = useRef(beatStates)
  const subdivisionRef = useRef(subdivision)
  const speedRef = useRef(speed)
  const timerEnabledRef = useRef(timerEnabled)
  const timerMinutesRef = useRef(timerMinutes)
  useEffect(() => {
    bpmRef.current = bpm
  }, [bpm])
  useEffect(() => {
    beatStatesRef.current = beatStates
  }, [beatStates])
  useEffect(() => {
    subdivisionRef.current = subdivision
  }, [subdivision])
  useEffect(() => {
    speedRef.current = speed
  }, [speed])
  useEffect(() => {
    timerEnabledRef.current = timerEnabled
  }, [timerEnabled])
  useEffect(() => {
    timerMinutesRef.current = timerMinutes
  }, [timerMinutes])

  const clearTimer = () => {
    if (timeoutRef.current != null) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  const stop = useCallback(() => {
    runningRef.current = false
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    clearTimer()
    setPlaying(false)
    setBeatPos(null)
    setMeasureCount(0)
    measureCountRef.current = 0
  }, [])

  useEffect(() => stop, [stop])

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
    const states = beatStatesRef.current
    const beats = states.length
    const subCount = SUBDIVISION_COUNT[subdivisionRef.current]
    const unit = 1 / subCount

    const lookaheadBeats = LOOKAHEAD_SEC / secPerBeat
    const windowEnd = elapsed + lookaheadBeats
    const from = scheduledToBeatRef.current

    // Walk subdivision-sized steps, not whole beats, so eighths/16ths/triplets
    // land between the main clicks. Step 0 of each beat IS the beat itself
    // (accent/normal from beatStates); the rest are quiet subdivision ticks —
    // both are skipped if that beat is muted.
    const startStep = Math.ceil((from - 1e-9) / unit)
    for (let step = startStep; step * unit < windowEnd; step++) {
      const pos = step * unit
      if (pos < from - 1e-9) continue
      const beatIndex = Math.floor(pos + 1e-9)
      const idx = ((beatIndex % beats) + beats) % beats
      const state = states[idx]
      if (state === 'off') continue
      const time = Math.max(Tone.now(), audioTimeForBeat(pos))
      if (step % subCount === 0) playClick(state === 'accent', time)
      else playSubClick(time)
    }
    scheduledToBeatRef.current = windowEnd

    const measuresElapsed = Math.floor(elapsed / beats + 1e-9)
    if (measuresElapsed > measureCountRef.current) {
      measureCountRef.current = measuresElapsed
      setMeasureCount(measuresElapsed)
      const sp = speedRef.current
      if (
        sp.enabled &&
        bpmRef.current < sp.maxBpm &&
        measuresElapsed % sp.everyMeasures === 0
      ) {
        const next = Math.min(sp.maxBpm, bpmRef.current + sp.deltaBpm)
        if (next !== bpmRef.current) {
          bpmRef.current = next
          reanchor()
          setBpmState(next)
        }
      }
    }

    setBeatPos(((elapsed % beats) + beats) % beats)
    rafRef.current = requestAnimationFrame(() => frameRef.current())
  }, [reanchor])

  useEffect(() => {
    frameRef.current = frame
  }, [frame])

  const start = useCallback(async () => {
    await unlockAudio()
    runningRef.current = true
    elapsedBeatsRef.current = 0
    scheduledToBeatRef.current = 0
    lastFrameMsRef.current = performance.now()
    audioAnchorRef.current = Tone.now() + 0.05
    beatAnchorRef.current = 0
    measureCountRef.current = 0
    setMeasureCount(0)
    setPlaying(true)
    rafRef.current = requestAnimationFrame(() => frameRef.current())
    if (timerEnabledRef.current) {
      timeoutRef.current = window.setTimeout(stop, timerMinutesRef.current * 60_000)
    }
  }, [stop])

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

  const setSignature = useCallback((next: TimeSignature) => {
    setSignatureState(next)
    setBeatStates(defaultBeatStates(SIGNATURE_BEATS[next]))
  }, [])

  const cycleBeat = useCallback((index: number) => {
    setBeatStates((prev) =>
      prev.map((s, i) => (i === index ? nextBeatState(s) : s)),
    )
  }, [])

  const setTimerMinutesClamped = useCallback((next: number) => {
    setTimerMinutes(Math.max(MIN_TIMER_MIN, Math.min(MAX_TIMER_MIN, Math.round(next))))
  }, [])

  const setSpeed = useCallback((patch: Partial<SpeedTrainer>) => {
    setSpeedState((s) => ({ ...s, ...patch }))
  }, [])

  return {
    playing,
    bpm,
    signature,
    beatStates,
    beatPos,
    subdivision,
    measureCount,
    speed,
    timerEnabled,
    timerMinutes,
    togglePlay,
    setBpm,
    setSignature,
    cycleBeat,
    setSubdivision: setSubdivisionState,
    setSpeed,
    setTimerEnabled,
    setTimerMinutes: setTimerMinutesClamped,
  }
}

export default function MetronomeTrainer() {
  const m = useMetronome()
  const tapTimes = useRef<number[]>([])

  const tap = () => {
    const now = performance.now()
    const taps = tapTimes.current.filter((t) => now - t < TAP_TIMEOUT_MS)
    taps.push(now)
    tapTimes.current = taps
    if (taps.length >= 2) {
      const gaps = taps.slice(1).map((t, i) => t - taps[i])
      const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length
      m.setBpm(60000 / avg)
    }
  }

  const num =
    'w-16 bg-surface-2 border border-border rounded-md px-2 py-1 text-sm text-center tabular-nums'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Metronome</h1>
        <p className="text-muted text-sm mt-1">
          A steady click with tap tempo, a time signature, a per-beat accent
          pattern, and beat subdivisions.
        </p>
      </header>

      <div className="rounded-xl border border-border bg-surface p-6 space-y-6">
        <div className="flex flex-col items-center gap-5">
          <Segmented
            value={m.signature}
            onChange={m.setSignature}
            options={SIGNATURES.map((s) => ({ value: s, label: s }))}
          />
          <MetronomeVisual
            beatStates={m.beatStates}
            loopBeat={m.beatPos}
            countInBeatsLeft={null}
            playing={m.playing}
            onBeatClick={m.cycleBeat}
            size="lg"
          />
          <p className="text-xs text-muted text-center max-w-sm">
            Click a beat to cycle it: accent → normal → muted.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Subdivide</span>
            <Segmented
              size="sm"
              value={m.subdivision}
              onChange={m.setSubdivision}
              options={SUBDIVISIONS}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={m.togglePlay}
          className="w-full h-12 rounded-lg bg-accent text-black font-semibold hover:brightness-110 transition"
        >
          {m.playing ? '❚❚ Stop' : '▶ Play'}
        </button>

        <div className="flex flex-wrap items-center justify-center gap-3 border-t border-border pt-5">
          <span className="text-sm font-medium tabular-nums">
            {m.bpm} <span className="text-xs font-normal text-muted">BPM</span>
          </span>
          <input
            type="range"
            min={MIN_BPM}
            max={MAX_BPM}
            value={m.bpm}
            onChange={(e) => m.setBpm(Number(e.target.value))}
            className="w-40 sm:w-56"
          />
          <input
            type="number"
            min={MIN_BPM}
            max={MAX_BPM}
            value={m.bpm}
            onChange={(e) => m.setBpm(Number(e.target.value))}
            className={num}
          />
          <button
            type="button"
            onClick={tap}
            className="h-8 px-3 rounded-md border border-border text-sm text-muted hover:text-text hover:border-muted"
          >
            Tap
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 border-t border-border pt-5">
          <Toggle
            compact
            label="Speed trainer"
            checked={m.speed.enabled}
            onChange={() => m.setSpeed({ enabled: !m.speed.enabled })}
          />
          <div
            className={`flex items-center gap-2 text-sm text-muted transition-opacity ${
              m.speed.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'
            }`}
          >
            <span>+</span>
            <input
              type="number"
              min={1}
              max={20}
              value={m.speed.deltaBpm}
              onChange={(e) => m.setSpeed({ deltaBpm: Number(e.target.value) })}
              className="w-14 bg-surface-2 border border-border rounded px-1.5 py-0.5 text-center"
            />
            <span>BPM every</span>
            <input
              type="number"
              min={1}
              max={32}
              value={m.speed.everyMeasures}
              onChange={(e) => m.setSpeed({ everyMeasures: Number(e.target.value) })}
              className="w-14 bg-surface-2 border border-border rounded px-1.5 py-0.5 text-center"
            />
            <span>measures, up to</span>
            <input
              type="number"
              min={MIN_BPM}
              max={MAX_BPM}
              value={m.speed.maxBpm}
              onChange={(e) => m.setSpeed({ maxBpm: Number(e.target.value) })}
              className="w-16 bg-surface-2 border border-border rounded px-1.5 py-0.5 text-center"
            />
          </div>
          {m.speed.enabled && m.playing && (
            <span className="text-sm text-muted tabular-nums">
              measure {m.measureCount}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 border-t border-border pt-5">
          <Toggle
            compact
            label="Practice timer"
            checked={m.timerEnabled}
            onChange={() => m.setTimerEnabled(!m.timerEnabled)}
          />
          <div
            className={`flex items-center gap-2 text-sm text-muted transition-opacity ${
              m.timerEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'
            }`}
          >
            <span>stop after</span>
            <input
              type="number"
              min={MIN_TIMER_MIN}
              max={MAX_TIMER_MIN}
              value={m.timerMinutes}
              onChange={(e) => m.setTimerMinutes(Number(e.target.value))}
              className={num}
            />
            <span>min</span>
          </div>
        </div>
      </div>
    </div>
  )
}
