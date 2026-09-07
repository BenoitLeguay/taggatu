import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Applied lazily so the audio engine (and Tone.js) stays out of the main bundle.
function applyMasterVolume(v: number) {
  void import('../core/audio/engine').then((m) => m.setMasterVolume(v))
}

export interface SettingsState {
  masterVolume: number // 0..1
  metronomeEnabled: boolean
  accentFirstBeat: boolean
  countIn: boolean
  arpAudio: boolean // play the arpeggio notes, not just the click
  showFingering: boolean
  showNoteNames: boolean

  setMasterVolume: (v: number) => void
  toggle: (key: BooleanSettingKey) => void
  set: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void
}

type BooleanSettingKey = {
  [K in keyof SettingsState]: SettingsState[K] extends boolean ? K : never
}[keyof SettingsState]

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      masterVolume: 0.85,
      metronomeEnabled: true,
      accentFirstBeat: true,
      countIn: true,
      arpAudio: true,
      showFingering: true,
      showNoteNames: false,

      setMasterVolume: (v) => {
        applyMasterVolume(v)
        set({ masterVolume: v })
      },
      toggle: (key) => set((s) => ({ [key]: !s[key] }) as Partial<SettingsState>),
      set: (key, value) => set({ [key]: value } as Partial<SettingsState>),
    }),
    {
      name: 'taggatu.settings',
      partialize: ({ setMasterVolume: _s, toggle: _t, set: _se, ...rest }) =>
        rest,
    },
  ),
)
