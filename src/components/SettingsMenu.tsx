import { useEffect, useRef, useState } from 'react'
import { useSettings } from '../store/settings'
import { Toggle } from './ui/Toggle'

export function SettingsMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const s = useSettings()

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="px-2.5 py-1.5 rounded-md text-sm text-muted hover:text-text hover:bg-surface-2 transition-colors"
        aria-expanded={open}
        aria-label="Settings"
      >
        ⚙ Settings
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-lg border border-border bg-surface-2 shadow-xl p-4 space-y-4 z-30">
          <div>
            <label className="flex justify-between text-xs text-muted mb-1">
              <span>Master volume</span>
              <span>{Math.round(s.masterVolume * 100)}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={s.masterVolume}
              onChange={(e) => s.setMasterVolume(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="space-y-2.5">
            <Toggle
              label="Metronome"
              checked={s.metronomeEnabled}
              onChange={() => s.toggle('metronomeEnabled')}
            />
            <Toggle
              label="Accent first beat"
              checked={s.accentFirstBeat}
              onChange={() => s.toggle('accentFirstBeat')}
            />
            <Toggle
              label="Count-in bar"
              checked={s.countIn}
              onChange={() => s.toggle('countIn')}
            />
            <Toggle
              label="Play arpeggio audio"
              checked={s.arpAudio}
              onChange={() => s.toggle('arpAudio')}
            />
            <Toggle
              label="Show fingering"
              checked={s.showFingering}
              onChange={() => s.toggle('showFingering')}
            />
            <Toggle
              label="Show note names"
              checked={s.showNoteNames}
              onChange={() => s.toggle('showNoteNames')}
            />
          </div>
        </div>
      )}
    </div>
  )
}
