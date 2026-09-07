export interface TrainerMeta {
  slug: string
  path: string
  title: string
  tagline: string
  icon: string
  accent: string
  status: 'polished' | 'functional'
}

/** Single source of truth for the five practice modules. */
export const TRAINERS: TrainerMeta[] = [
  {
    slug: 'arpeggios',
    path: '/arpeggios',
    title: 'Arpeggio Trainer',
    tagline: "Giuliani's 120 right-hand studies on a scrolling fretboard.",
    icon: '🎼',
    accent: 'var(--color-accent)',
    status: 'polished',
  },
  {
    slug: 'fretboard',
    path: '/fretboard',
    title: 'Fretboard Trainer',
    tagline: 'Name the note, or find it on the neck. Beat the clock.',
    icon: '🧭',
    accent: 'var(--color-cool)',
    status: 'functional',
  },
  {
    slug: 'ear',
    path: '/ear',
    title: 'Ear Training',
    tagline: 'Identify intervals and chords by sound.',
    icon: '👂',
    accent: '#c084fc',
    status: 'functional',
  },
  {
    slug: 'rhythm',
    path: '/rhythm',
    title: 'Rhythm Trainer',
    tagline: 'Tap the pattern in time. Get scored on your timing.',
    icon: '🥁',
    accent: '#4ade80',
    status: 'functional',
  },
  {
    slug: 'pitch',
    path: '/pitch',
    title: 'Pitch & Tuner',
    tagline: 'Live pitch detection: tune up, then play the target notes.',
    icon: '🎤',
    accent: '#f87171',
    status: 'functional',
  },
]

export function trainerBySlug(slug: string): TrainerMeta | undefined {
  return TRAINERS.find((t) => t.slug === slug)
}
