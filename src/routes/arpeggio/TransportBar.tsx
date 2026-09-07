import { useRef } from 'react'
import { useSettings } from '../../store/settings'
import { Toggle } from '../../components/ui/Toggle'
import type { ArpPlayerState } from './useArpeggioPlayer'

interface TransportBarProps {
  player: ArpPlayerState
}

export function TransportBar({ player }: TransportBarProps) {
  const settings = useSettings()
  const tapTimes = useRef<number[]>([])

  const tap = () => {
    const now = performance.now()
    const taps = tapTimes.current.filter((t) => now - t < 2500)
    taps.push(now)
    tapTimes.current = taps
    if (taps.length >= 2) {
      const gaps = taps.slice(1).map((t, i) => t - taps[i])
      const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length
      player.setBpm(60000 / avg)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={player.togglePlay}
          className="h-11 px-5 rounded-lg bg-accent text-black font-semibold hover:brightness-110 transition"
        >
          {player.playing ? '❚❚ Stop' : '▶ Play'}
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted w-10 text-right">BPM</span>
          <input
            type="range"
            min={30}
            max={200}
            value={player.bpm}
            onChange={(e) => player.setBpm(Number(e.target.value))}
            className="w-44"
          />
          <input
            type="number"
            min={30}
            max={220}
            value={player.bpm}
            onChange={(e) => player.setBpm(Number(e.target.value))}
            className="w-16 bg-surface-2 border border-border rounded-md px-2 py-1 text-sm text-center"
          />
          <button
            type="button"
            onClick={tap}
            className="px-3 py-1.5 rounded-md border border-border text-sm text-muted hover:text-text"
          >
            Tap
          </button>
        </div>

        <div className="flex items-center gap-4 ml-auto text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={player.loop}
              onChange={(e) => player.setLoop(e.target.checked)}
            />
            Loop
          </label>
          {player.loop && (
            <span className="text-muted tabular-nums">
              loop {player.loopCount}
            </span>
          )}
          {player.countingIn && (
            <span className="text-accent animate-pulse">count-in…</span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-3">
        <Toggle
          label="Metronome"
          checked={settings.metronomeEnabled}
          onChange={() => settings.toggle('metronomeEnabled')}
        />
        <Toggle
          label="Arpeggio audio"
          checked={settings.arpAudio}
          onChange={() => settings.toggle('arpAudio')}
        />
        <Toggle
          label="Count-in"
          checked={settings.countIn}
          onChange={() => settings.toggle('countIn')}
        />

        <div className="flex items-center gap-2 ml-auto">
          <Toggle
            label="Speed trainer"
            checked={player.speed.enabled}
            onChange={() => player.setSpeed({ enabled: !player.speed.enabled })}
          />
          {player.speed.enabled && (
            <span className="text-xs text-muted flex items-center gap-1">
              +
              <input
                type="number"
                min={1}
                max={20}
                value={player.speed.deltaBpm}
                onChange={(e) =>
                  player.setSpeed({ deltaBpm: Number(e.target.value) })
                }
                className="w-12 bg-surface-2 border border-border rounded px-1 py-0.5 text-center"
              />
              BPM every
              <input
                type="number"
                min={1}
                max={16}
                value={player.speed.everyLoops}
                onChange={(e) =>
                  player.setSpeed({ everyLoops: Number(e.target.value) })
                }
                className="w-12 bg-surface-2 border border-border rounded px-1 py-0.5 text-center"
              />
              loops, to
              <input
                type="number"
                min={40}
                max={220}
                value={player.speed.maxBpm}
                onChange={(e) =>
                  player.setSpeed({ maxBpm: Number(e.target.value) })
                }
                className="w-14 bg-surface-2 border border-border rounded px-1 py-0.5 text-center"
              />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
