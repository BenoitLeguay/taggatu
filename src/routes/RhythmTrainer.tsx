import { useCallback, useEffect, useRef, useState } from 'react'
import { getTransport, playClick, Tone, unlockAudio } from '../core/audio/engine'

const SLOTS = 8 // eighth-note grid over one 4/4 bar

interface TapResult {
  slot: number
  errorMs: number
}

function randomPattern(): boolean[] {
  const p = Array.from({ length: SLOTS }, (_, i) => (i === 0 ? true : Math.random() < 0.55))
  if (p.filter(Boolean).length < 3) return randomPattern()
  return p
}

export default function RhythmTrainer() {
  const [bpm, setBpm] = useState(84)
  const [pattern, setPattern] = useState<boolean[]>(randomPattern)
  const [running, setRunning] = useState(false)
  const [slot, setSlot] = useState(-1)
  const [taps, setTaps] = useState<TapResult[]>([])
  const [flash, setFlash] = useState<number | null>(null)

  const patternRef = useRef(pattern)
  const bpmRef = useRef(bpm)
  const clickId = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const startedRef = useRef(false)
  useEffect(() => {
    patternRef.current = pattern
  }, [pattern])
  useEffect(() => {
    bpmRef.current = bpm
  }, [bpm])

  const barSeconds = () => (60 / bpmRef.current) * 4
  const slotSeconds = () => barSeconds() / SLOTS

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    if (startedRef.current) {
      const t = getTransport()
      if (clickId.current !== null) t.clear(clickId.current)
      clickId.current = null
      t.stop()
      t.cancel()
      t.position = 0
      startedRef.current = false
    }
    setRunning(false)
    setSlot(-1)
  }, [])

  useEffect(() => stop, [stop])

  const start = useCallback(async () => {
    await unlockAudio()
    stop()
    const t = getTransport()
    t.bpm.value = bpmRef.current
    setTaps([])

    clickId.current = t.scheduleRepeat((time) => {
      const beat = Math.round(t.ticks / Tone.Ticks('4n').valueOf())
      playClick(beat % 4 === 0, time)
    }, '4n')

    startedRef.current = true
    t.start()
    setRunning(true)

    const tick = () => {
      const pos = t.seconds % barSeconds()
      setSlot(Math.floor(pos / slotSeconds()) % SLOTS)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [stop])

  const tap = useCallback(() => {
    if (!running) return
    const t = getTransport()
    const pos = t.seconds % barSeconds()
    const ss = slotSeconds()
    // nearest slot, wrap-aware
    let best = 0
    let bestErr = Infinity
    for (let i = 0; i < SLOTS; i++) {
      let d = Math.abs(pos - i * ss)
      d = Math.min(d, barSeconds() - d)
      if (d < bestErr) {
        bestErr = d
        best = i
      }
    }
    const errorMs = bestErr * 1000
    setFlash(best)
    setTimeout(() => setFlash(null), 120)
    if (patternRef.current[best] && errorMs < 160) {
      setTaps((prev) => [...prev, { slot: best, errorMs }])
    } else {
      setTaps((prev) => [...prev, { slot: best, errorMs: 999 }])
    }
  }, [running])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        tap()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tap])

  const hits = taps.filter((t) => t.errorMs < 160)
  const accuracy = hits.length
    ? Math.round(hits.reduce((a, b) => a + b.errorMs, 0) / hits.length)
    : null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <header className="flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-semibold">Rhythm Trainer</h1>
        <div className="ml-auto text-sm text-muted tabular-nums">
          {accuracy === null ? 'tap on the marked slots' : `±${accuracy} ms avg · ${hits.length} hits`}
        </div>
      </header>

      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="grid grid-cols-8 gap-1.5">
          {pattern.map((active, i) => (
            <div
              key={i}
              className={`aspect-square rounded-lg border flex items-center justify-center text-xs font-mono transition-colors ${
                flash === i
                  ? 'bg-accent text-black border-accent'
                  : slot === i
                    ? 'border-accent bg-surface-2'
                    : active
                      ? 'border-cool/60 bg-cool/10 text-cool'
                      : 'border-border bg-surface-2/40 text-muted'
              }`}
            >
              {i % 2 === 0 ? i / 2 + 1 : '&'}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={running ? stop : start}
          className="h-11 px-5 rounded-lg bg-accent text-black font-semibold hover:brightness-110"
        >
          {running ? '❚❚ Stop' : '▶ Start'}
        </button>
        <button
          type="button"
          onClick={tap}
          className="h-11 px-6 rounded-lg border border-border hover:bg-surface-2"
        >
          Tap (Space)
        </button>
        <button
          type="button"
          onClick={() => {
            setPattern(randomPattern())
            setTaps([])
          }}
          className="h-11 px-4 rounded-lg border border-border text-muted hover:text-text"
        >
          New pattern
        </button>

        <label className="flex items-center gap-2 text-sm ml-auto">
          <span className="text-muted">BPM</span>
          <input
            type="range"
            min={50}
            max={140}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
          />
          <span className="tabular-nums w-8">{bpm}</span>
        </label>
      </div>

      <p className="text-xs text-muted">
        The metronome clicks every quarter note. Tap on the highlighted slots
        (downbeats are numbers, off-beats are “&”). Within ±160 ms counts as a
        hit; the average error is your timing accuracy.
      </p>
    </div>
  )
}
