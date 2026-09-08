import { lazy, Suspense } from 'react'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Home } from './routes/Home'

const ArpeggioTrainer = lazy(() => import('./routes/arpeggio/ArpeggioTrainer'))
const FretboardTrainer = lazy(() => import('./routes/FretboardTrainer'))
const EarTrainer = lazy(() => import('./routes/EarTrainer'))
const PitchTrainer = lazy(() => import('./routes/PitchTrainer'))
const ChordScaleExplorer = lazy(() => import('./routes/ChordScaleExplorer'))

function Loading() {
  return <div className="text-muted text-sm py-12 text-center">Loading…</div>
}

// Hash routing (/#/arpeggios) needs no server-side rewrite rules, which
// GitHub Pages doesn't support for a static project site — deep links and
// hard refreshes just work.
const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      {
        path: 'arpeggios',
        element: (
          <Suspense fallback={<Loading />}>
            <ArpeggioTrainer />
          </Suspense>
        ),
      },
      {
        path: 'fretboard',
        element: (
          <Suspense fallback={<Loading />}>
            <FretboardTrainer />
          </Suspense>
        ),
      },
      {
        path: 'ear',
        element: (
          <Suspense fallback={<Loading />}>
            <EarTrainer />
          </Suspense>
        ),
      },
      {
        path: 'pitch',
        element: (
          <Suspense fallback={<Loading />}>
            <PitchTrainer />
          </Suspense>
        ),
      },
      {
        path: 'chord-scale',
        element: (
          <Suspense fallback={<Loading />}>
            <ChordScaleExplorer />
          </Suspense>
        ),
      },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
