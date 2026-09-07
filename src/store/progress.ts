import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ExerciseProgress {
  /** Fastest tempo the user has looped this exercise at, in BPM. */
  bestBpm: number
  /** Total loops completed, all sessions. */
  loops: number
  lastPracticed: number // epoch ms
  favorite: boolean
}

interface ProgressState {
  byExercise: Record<number, ExerciseProgress>
  recordLoop: (id: number, bpm: number) => void
  toggleFavorite: (id: number) => void
  get: (id: number) => ExerciseProgress | undefined
}

const empty: ExerciseProgress = {
  bestBpm: 0,
  loops: 0,
  lastPracticed: 0,
  favorite: false,
}

export const useProgress = create<ProgressState>()(
  persist(
    (set, getState) => ({
      byExercise: {},
      recordLoop: (id, bpm) =>
        set((s) => {
          const prev = s.byExercise[id] ?? empty
          return {
            byExercise: {
              ...s.byExercise,
              [id]: {
                ...prev,
                loops: prev.loops + 1,
                bestBpm: Math.max(prev.bestBpm, Math.round(bpm)),
                lastPracticed: Date.now(),
              },
            },
          }
        }),
      toggleFavorite: (id) =>
        set((s) => {
          const prev = s.byExercise[id] ?? empty
          return {
            byExercise: {
              ...s.byExercise,
              [id]: { ...prev, favorite: !prev.favorite },
            },
          }
        }),
      get: (id) => getState().byExercise[id],
    }),
    { name: 'taggatu.progress' },
  ),
)
