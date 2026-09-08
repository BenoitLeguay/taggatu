import { Link } from 'react-router-dom'
import { TRAINERS } from '../trainers'

const ARPEGGIO_COUNT = 120

export function Home() {
  return (
    <div className="space-y-8">
      <section className="pt-4">
        <h1 className="text-3xl font-semibold tracking-tight">
          Practice, not noodling.
        </h1>
        <p className="text-muted mt-2 max-w-2xl">
          Six focused trainers for classical and fingerstyle guitar. The
          centrepiece is a scrolling-fretboard runner for all {ARPEGGIO_COUNT} of
          Giuliani&rsquo;s right-hand arpeggio studies, at any tempo you like.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TRAINERS.map((t) => (
          <Link
            key={t.slug}
            to={t.path}
            className="group rounded-xl border border-border bg-surface p-5 hover:border-accent/50 hover:bg-surface-2 transition-colors"
          >
            <div className="flex items-start justify-between">
              <span className="text-3xl" style={{ filter: 'saturate(1.1)' }}>
                {t.icon}
              </span>
              {t.status === 'polished' ? (
                <span className="text-[10px] uppercase tracking-wide rounded-full border border-accent/40 text-accent px-2 py-0.5">
                  Featured
                </span>
              ) : (
                <span className="text-[10px] uppercase tracking-wide rounded-full border border-border text-muted px-2 py-0.5">
                  Beta
                </span>
              )}
            </div>
            <h2 className="mt-3 font-medium group-hover:text-accent transition-colors">
              {t.title}
            </h2>
            <p className="text-sm text-muted mt-1">{t.tagline}</p>
          </Link>
        ))}
      </section>
    </div>
  )
}
