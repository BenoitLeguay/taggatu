import type { StringNumber } from '../music/tuning'

export interface FretMarker {
  string: StringNumber
  /** 0 = open string, played behind the nut. */
  fret: number
  label?: string
  /** Visual role; drives colour. */
  variant?: 'primary' | 'chord' | 'ghost' | 'muted' | 'correct' | 'wrong'
}

export const SINGLE_DOT_FRETS = [3, 5, 7, 9, 15, 17, 19, 21]
export const DOUBLE_DOT_FRETS = [12, 24]
