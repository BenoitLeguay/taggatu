import { useMemo, useState } from 'react'
import { Fretboard } from '../core/fretboard/Fretboard'
import type { FretMarker } from '../core/fretboard/types'
import { Segmented } from '../components/ui/Segmented'
import { CHORD_FORMULAS, CHORD_SYMBOLS } from '../core/music/chords'
import { NOTE_NAMES_SHARP, midiToName, pitchClass } from '../core/music/notes'
import { SCALES, scalePitchClasses } from '../core/music/scales'
import { STANDARD_TUNING, STRING_NUMBERS, type StringNumber } from '../core/music/tuning'
import { findChordVoicings } from '../core/music/voicing'
import { pluckMidi, strumMidis, unlockAudio } from '../core/audio/engine'

type Mode = 'scale' | 'chord'

const SCALE_MAX_FRET = 12
const CHORD_QUALITIES = Object.keys(CHORD_FORMULAS)

export default function ChordScaleExplorer() {
  const [mode, setMode] = useState<Mode>('scale')
  const [rootPc, setRootPc] = useState(0) // C
  const [scaleId, setScaleId] = useState(SCALES[0].id)
  const [quality, setQuality] = useState('maj')
  const [voicingIndex, setVoicingIndex] = useState(0)

  const rootName = NOTE_NAMES_SHARP[rootPc]

  const voicings = useMemo(
    () => findChordVoicings(rootPc, quality),
    [rootPc, quality],
  )
  const activeVoicing = voicings[Math.min(voicingIndex, voicings.length - 1)]

  // a new root or chord quality invalidates the previously-picked position,
  // so these wrap the setters rather than resetting it from an effect
  const selectRoot = (pc: number) => {
    setRootPc(pc)
    setVoicingIndex(0)
  }
  const selectQuality = (q: string) => {
    setQuality(q)
    setVoicingIndex(0)
  }

  const scaleMarkers = useMemo<FretMarker[]>(() => {
    if (mode !== 'scale') return []
    const tones = scalePitchClasses(rootPc, scaleId)
    const out: FretMarker[] = []
    for (const s of STRING_NUMBERS) {
      for (let f = 0; f <= SCALE_MAX_FRET; f++) {
        const pc = pitchClass(STANDARD_TUNING[s] + f)
        if (!tones.has(pc)) continue
        out.push({
          string: s,
          fret: f,
          variant: pc === rootPc ? 'primary' : 'chord',
          label: NOTE_NAMES_SHARP[pc],
        })
      }
    }
    return out
  }, [mode, rootPc, scaleId])

  const chordMarkers = useMemo<FretMarker[]>(() => {
    if (mode !== 'chord' || !activeVoicing) return []
    return STRING_NUMBERS.map((s): FretMarker => {
      const fret = activeVoicing.frets[s]
      if (fret == null) return { string: s, fret: 0, variant: 'muted', label: '×' }
      const pc = pitchClass(STANDARD_TUNING[s] + fret)
      return {
        string: s,
        fret,
        variant: pc === rootPc ? 'primary' : 'chord',
        label: fret === 0 ? '○' : midiToName(STANDARD_TUNING[s] + fret),
      }
    })
  }, [mode, activeVoicing, rootPc])

  const chordFromFret = activeVoicing
    ? Math.max(0, activeVoicing.isOpen ? 0 : activeVoicing.positionFret - 1)
    : 0
  const chordToFret = chordFromFret + 5

  const handleSelect = async (string: StringNumber, fret: number) => {
    await unlockAudio()
    pluckMidi(STANDARD_TUNING[string] + fret)
  }

  const playChord = async () => {
    if (!activeVoicing) return
    await unlockAudio()
    const midis = STRING_NUMBERS.map((s) => {
      const fret = activeVoicing.frets[s]
      return fret == null ? null : STANDARD_TUNING[s] + fret
    }).filter((m): m is number => m != null)
    strumMidis(midis)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-semibold">Chord &amp; Scale Explorer</h1>
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'scale', label: 'Scale' },
            { value: 'chord', label: 'Chord' },
          ]}
        />
      </header>

      <div>
        <div className="text-xs text-muted mb-1.5">Root</div>
        <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
          {NOTE_NAMES_SHARP.map((n, pc) => (
            <button
              key={n}
              type="button"
              onClick={() => selectRoot(pc)}
              className={`py-1.5 rounded-lg border text-sm font-mono transition-colors ${
                pc === rootPc
                  ? 'border-accent bg-accent/15 text-accent'
                  : 'border-border bg-surface hover:bg-surface-2 hover:border-muted'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {mode === 'scale' ? (
        <div>
          <div className="text-xs text-muted mb-1.5">Scale</div>
          <div className="flex flex-wrap gap-1.5">
            {SCALES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setScaleId(s.id)}
                className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                  s.id === scaleId
                    ? 'border-accent bg-accent/15 text-accent'
                    : 'border-border bg-surface hover:bg-surface-2 hover:border-muted'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <div className="text-xs text-muted mb-1.5">Chord</div>
            <div className="flex flex-wrap gap-1.5">
              {CHORD_QUALITIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => selectQuality(q)}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                    q === quality
                      ? 'border-accent bg-accent/15 text-accent'
                      : 'border-border bg-surface hover:bg-surface-2 hover:border-muted'
                  }`}
                >
                  {rootName}
                  {CHORD_SYMBOLS[q]}
                </button>
              ))}
            </div>
          </div>

          {voicings.length > 0 && (
            <div>
              <div className="text-xs text-muted mb-1.5">Position</div>
              <div className="flex flex-wrap gap-1.5">
                {voicings.map((v, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setVoicingIndex(i)}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-mono transition-colors ${
                      i === voicingIndex
                        ? 'border-accent bg-accent/15 text-accent'
                        : 'border-border bg-surface hover:bg-surface-2 hover:border-muted'
                    }`}
                  >
                    {v.isOpen ? 'Open' : `Fret ${v.positionFret}`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Fretboard
        fromFret={mode === 'chord' ? chordFromFret : 0}
        toFret={mode === 'chord' ? chordToFret : SCALE_MAX_FRET}
        height={mode === 'chord' ? 220 : 260}
        markers={mode === 'scale' ? scaleMarkers : chordMarkers}
        onSelect={handleSelect}
      />

      {mode === 'chord' && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={playChord}
            disabled={!activeVoicing}
            className="h-10 px-5 rounded-lg bg-accent text-black font-semibold hover:brightness-110 transition disabled:opacity-40"
          >
            ▶ Play chord
          </button>
          {!activeVoicing && (
            <span className="text-sm text-bad">
              No playable voicing found for this chord.
            </span>
          )}
        </div>
      )}

      <p className="text-xs text-muted">
        {mode === 'scale'
          ? 'Root notes are highlighted in orange, other scale tones in blue. Click any dot to hear it.'
          : 'Root notes are highlighted in orange, other chord tones in blue, "×" marks a muted string. Pick a position to move the shape up the neck.'}
      </p>
    </div>
  )
}
