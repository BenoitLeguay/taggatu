import { useMemo, useState } from 'react'
import { difficulty, exercises } from '../../data/arpeggios'
import { useProgress } from '../../store/progress'
import { Segmented } from '../../components/ui/Segmented'

interface ArpeggioListProps {
  selectedId: number
  onSelect: (id: number) => void
}

type Filter = 'all' | 'favorites' | 'easy' | 'medium' | 'hard'

export function ArpeggioList({ selectedId, onSelect }: ArpeggioListProps) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const progress = useProgress((s) => s.byExercise)
  const toggleFavorite = useProgress((s) => s.toggleFavorite)

  const filtered = useMemo(() => {
    const q = query.trim()
    return exercises.filter((ex) => {
      if (q && !String(ex.id).includes(q) && !ex.name.includes(q)) return false
      const d = difficulty(ex)
      const fav = progress[ex.id]?.favorite
      switch (filter) {
        case 'favorites':
          return !!fav
        case 'easy':
          return d <= 2
        case 'medium':
          return d === 3
        case 'hard':
          return d >= 4
        default:
          return true
      }
    })
  }, [query, filter, progress])

  return (
    <div className="rounded-xl border border-border bg-surface flex flex-col h-[70vh] lg:h-[calc(100vh-9rem)]">
      <div className="p-3 border-b border-border space-y-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search No. …"
          className="w-full bg-surface-2 border border-border rounded-md px-3 py-1.5 text-sm"
        />
        <Segmented
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'favorites', label: '★' },
            { value: 'easy', label: 'Easy' },
            { value: 'medium', label: 'Med' },
            { value: 'hard', label: 'Hard' },
          ]}
        />
      </div>

      <ul className="overflow-y-auto flex-1 p-1.5">
        {filtered.map((ex) => {
          const d = difficulty(ex)
          const p = progress[ex.id]
          const selected = ex.id === selectedId
          return (
            <li key={ex.id}>
              <button
                type="button"
                onClick={() => onSelect(ex.id)}
                className={`w-full text-left rounded-lg px-3 py-2 flex items-center gap-3 transition-colors ${
                  selected ? 'bg-surface-2 ring-1 ring-accent/40' : 'hover:bg-surface-2/60'
                }`}
              >
                <span className="font-mono text-sm w-10 tabular-nums text-muted">
                  {ex.id}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm truncate">
                    {ex.subdivision}
                    {ex.flags.includes('rhythm-approx') && (
                      <span
                        title="Rhythm normalised (dense two-voice study)"
                        className="text-muted"
                      >
                        {' '}
                        ≈
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-muted">
                    {ex.notesPerBar} notes/bar
                    {p?.bestBpm ? ` · best ${p.bestBpm} BPM` : ''}
                  </span>
                </span>
                <span
                  className="text-[10px] tracking-widest"
                  style={{ color: d >= 4 ? 'var(--color-bad)' : d === 3 ? 'var(--color-accent)' : 'var(--color-good)' }}
                >
                  {'●'.repeat(d)}
                  <span className="opacity-25">{'●'.repeat(5 - d)}</span>
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFavorite(ex.id)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation()
                      toggleFavorite(ex.id)
                    }
                  }}
                  className={`text-sm ${p?.favorite ? 'text-accent' : 'text-border hover:text-muted'}`}
                >
                  ★
                </span>
              </button>
            </li>
          )
        })}
        {filtered.length === 0 && (
          <li className="text-sm text-muted text-center py-8">No matches.</li>
        )}
      </ul>
    </div>
  )
}
