import { NavLink, Outlet } from 'react-router-dom'
import { TRAINERS } from '../trainers'
import { SettingsMenu } from './SettingsMenu'

export function Layout() {
  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-6">
          <NavLink to="/" className="flex items-center gap-2 shrink-0">
            <span className="text-xl">🎸</span>
            <span className="font-semibold tracking-tight">taggatu</span>
          </NavLink>

          <nav className="hidden md:flex items-center gap-1 text-sm">
            {TRAINERS.map((t) => (
              <NavLink
                key={t.slug}
                to={t.path}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md transition-colors ${
                    isActive
                      ? 'bg-surface-2 text-text'
                      : 'text-muted hover:text-text hover:bg-surface-2/60'
                  }`
                }
              >
                {t.title.replace(' Trainer', '').replace(' Training', '')}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto">
            <SettingsMenu />
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-border text-xs text-muted">
        <div className="mx-auto max-w-6xl px-4 py-3 flex flex-wrap gap-x-4 gap-y-1">
          <span>taggatu — guitar practice</span>
          <span className="text-muted/70">
            Arpeggio material: Mauro Giuliani, 120 Right-Hand Studies (public
            domain)
          </span>
        </div>
      </footer>
    </div>
  )
}
