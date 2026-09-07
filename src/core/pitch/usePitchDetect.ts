import { useCallback, useEffect, useRef, useState } from 'react'
import { centsOff } from '../music/notes'
import { detectPitch } from './detector'

export interface LivePitch {
  frequency: number
  midi: number
  cents: number
  clarity: number
}

export interface UsePitchDetect {
  listening: boolean
  error: string | null
  pitch: LivePitch | null
  start: () => Promise<void>
  stop: () => void
}

/**
 * Opens the mic and runs the autocorrelation detector on an analyser node.
 * Smooths the reported frequency a little so the readout does not jitter.
 */
export function usePitchDetect(fftSize = 2048): UsePitchDetect {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pitch, setPitch] = useState<LivePitch | null>(null)

  const ctxRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const smoothedRef = useRef<number | null>(null)

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    void ctxRef.current?.close()
    ctxRef.current = null
    analyserRef.current = null
    smoothedRef.current = null
    setListening(false)
    setPitch(null)
  }, [])

  const start = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })
      const ctx = new AudioContext()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = fftSize
      source.connect(analyser)

      ctxRef.current = ctx
      streamRef.current = stream
      analyserRef.current = analyser
      setListening(true)

      const buffer = new Float32Array(analyser.fftSize)
      const loop = () => {
        const a = analyserRef.current
        const c = ctxRef.current
        if (!a || !c) return
        a.getFloatTimeDomainData(buffer)
        const result = detectPitch(buffer, c.sampleRate)
        if (result) {
          const prev = smoothedRef.current
          const f =
            prev == null ? result.frequency : prev * 0.7 + result.frequency * 0.3
          smoothedRef.current = f
          const { midi, cents } = centsOff(f)
          setPitch({ frequency: f, midi, cents, clarity: result.clarity })
        } else {
          smoothedRef.current = null
          setPitch(null)
        }
        rafRef.current = requestAnimationFrame(loop)
      }
      rafRef.current = requestAnimationFrame(loop)
    } catch (err) {
      setError(
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Microphone permission denied.'
          : `Could not open microphone: ${(err as Error).message}`,
      )
      setListening(false)
    }
  }, [fftSize])

  useEffect(() => stop, [stop])

  return { listening, error, pitch, start, stop }
}
