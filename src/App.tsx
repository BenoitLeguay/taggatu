import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Home } from './routes/Home'

const ArpeggioTrainer = lazy(() => import('./routes/arpeggio/ArpeggioTrainer'))
const FretboardTrainer = lazy(() => import('./routes/FretboardTrainer'))
const EarTrainer = lazy(() => import('./routes/EarTrainer'))
const RhythmTrainer = lazy(() => import('./routes/RhythmTrainer'))
const PitchTrainer = lazy(() => import('./routes/PitchTrainer'))

function Loading() {
  return <div className="text-muted text-sm py-12 text-center">Loading…</div>
}

const router = createBrowserRouter([
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
        path: 'rhythm',
        element: (
          <Suspense fallback={<Loading />}>
            <RhythmTrainer />
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
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
