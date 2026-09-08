import { useRef } from 'react'
import { useSettings } from '../../store/settings'
import { Toggle } from '../../components/ui/Toggle'
import { MetronomeVisual } from '../../components/MetronomeVisual'
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

  const num =
    'w-16 bg-surface-2 border border-border rounded-md px-2 py-1 text-sm text-center tabular-nums'

  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
      {/* row 1: transport */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <button
          type="button"
          onClick={player.togglePlay}
          className="h-11 w-28 rounded-lg bg-accent text-black font-semibold hover:brightness-110 transition"
        >
          {player.playing ? '❚❚ Stop' : '▶ Play'}
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">BPM</span>
          <input
            type="range"
            min={30}
            max={200}
            value={player.bpm}
            onChange={(e) => player.setBpm(Number(e.target.value))}
            className="w-40 sm:w-52"
          />
          <input
            type="number"
            min={30}
            max={220}
            value={player.bpm}
            onChange={(e) => player.setBpm(Number(e.target.value))}
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

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={player.loop}
            onChange={(e) => player.setLoop(e.target.checked)}
            className="h-4 w-4"
          />
          Loop
        </label>
        {player.loop && player.playing && (
          <span className="text-sm text-muted tabular-nums">
            loop {player.loopCount}
          </span>
        )}
      </div>

      {/* row 2: audio toggles, evenly spaced */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-3">
        <Toggle
          compact
          label="Metronome"
          checked={settings.metronomeEnabled}
          onChange={() => settings.toggle('metronomeEnabled')}
        />
        {settings.metronomeEnabled && (
          <MetronomeVisual
            beatStates={Array.from({ length: player.beatsPerMeasure }, (_, i) =>
              i === 0 && settings.accentFirstBeat ? 'accent' : 'normal',
            )}
            loopBeat={player.loopBeat}
            countInBeatsLeft={player.countInBeatsLeft}
            playing={player.playing}
          />
        )}
        <Toggle
          compact
          label="Accent beat 1"
          checked={settings.accentFirstBeat}
          onChange={() => settings.toggle('accentFirstBeat')}
        />
        <Toggle
          compact
          label="Arpeggio audio"
          checked={settings.arpAudio}
          onChange={() => settings.toggle('arpAudio')}
        />
        <Toggle
          compact
          label="Count-in"
          checked={settings.countIn}
          onChange={() => settings.toggle('countIn')}
        />
      </div>

      {/* row 3: speed trainer */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-3">
        <Toggle
          compact
          label="Speed trainer"
          checked={player.speed.enabled}
          onChange={() => player.setSpeed({ enabled: !player.speed.enabled })}
        />
        <div
          className={`flex items-center gap-2 text-sm text-muted transition-opacity ${
            player.speed.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'
          }`}
        >
          <span>+</span>
          <input
            type="number"
            min={1}
            max={20}
            value={player.speed.deltaBpm}
            onChange={(e) => player.setSpeed({ deltaBpm: Number(e.target.value) })}
            className="w-14 bg-surface-2 border border-border rounded px-1.5 py-0.5 text-center"
          />
          <span>BPM every</span>
          <input
            type="number"
            min={1}
            max={16}
            value={player.speed.everyLoops}
            onChange={(e) =>
              player.setSpeed({ everyLoops: Number(e.target.value) })
            }
            className="w-14 bg-surface-2 border border-border rounded px-1.5 py-0.5 text-center"
          />
          <span>loops, up to</span>
          <input
            type="number"
            min={40}
            max={220}
            value={player.speed.maxBpm}
            onChange={(e) => player.setSpeed({ maxBpm: Number(e.target.value) })}
            className="w-16 bg-surface-2 border border-border rounded px-1.5 py-0.5 text-center"
          />
        </div>
      </div>
    </div>
  )
}
