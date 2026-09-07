/**
 * Autocorrelation pitch detector (McLeod-style normalised square difference,
 * with parabolic interpolation on the chosen peak). Returns a frequency in Hz
 * or null when the frame is too quiet or too noisy to trust.
 */
export interface PitchResult {
  frequency: number
  clarity: number
  rms: number
}

const MIN_FREQ = 60 // ~B1, below drop-tuned guitars
const MAX_FREQ = 1400 // above the 22nd fret of the high E

export function detectPitch(
  buffer: Float32Array,
  sampleRate: number,
): PitchResult | null {
  const size = buffer.length

  let rms = 0
  for (let i = 0; i < size; i++) rms += buffer[i] * buffer[i]
  rms = Math.sqrt(rms / size)
  if (rms < 0.008) return null // silence gate

  const maxLag = Math.min(Math.floor(sampleRate / MIN_FREQ), size - 1)
  const minLag = Math.max(Math.floor(sampleRate / MAX_FREQ), 2)

  const nsdf = new Float32Array(maxLag + 1)
  for (let lag = minLag; lag <= maxLag; lag++) {
    let acf = 0
    let norm = 0
    for (let i = 0; i < size - lag; i++) {
      acf += buffer[i] * buffer[i + lag]
      norm += buffer[i] * buffer[i] + buffer[i + lag] * buffer[i + lag]
    }
    nsdf[lag] = norm > 0 ? (2 * acf) / norm : 0
  }

  // First positive-going zero crossing, then the highest peak after it.
  let lag = minLag
  while (lag <= maxLag && nsdf[lag] > 0) lag++
  while (lag <= maxLag && nsdf[lag] <= 0) lag++

  let bestLag = -1
  let bestVal = 0
  for (; lag <= maxLag; lag++) {
    if (nsdf[lag] > bestVal) {
      bestVal = nsdf[lag]
      bestLag = lag
    }
    if (nsdf[lag] < 0 && bestLag !== -1) break
  }

  if (bestLag === -1 || bestVal < 0.5) return null

  // Parabolic interpolation around the peak for sub-sample precision.
  const y1 = nsdf[bestLag - 1] ?? bestVal
  const y2 = bestVal
  const y3 = nsdf[bestLag + 1] ?? bestVal
  const denom = y1 - 2 * y2 + y3
  const shift = denom !== 0 ? (0.5 * (y1 - y3)) / denom : 0
  const trueLag = bestLag + shift

  const frequency = sampleRate / trueLag
  if (frequency < MIN_FREQ || frequency > MAX_FREQ) return null

  return { frequency, clarity: bestVal, rms }
}
