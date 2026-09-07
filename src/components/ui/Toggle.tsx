interface ToggleProps {
  label: string
  checked: boolean
  onChange: () => void
  hint?: string
  /** Compact: switch then label, natural width (for toolbars). Default: full
   *  width with the switch pushed to the right (for menu rows). */
  compact?: boolean
}

export function Toggle({
  label,
  checked,
  onChange,
  hint,
  compact = false,
}: ToggleProps) {
  // Track is 36px wide / 20px tall; knob 16px. inline-flex + items-center
  // vertically centres the knob; the inline transform slides it 2px..18px so it
  // always stays inside the track.
  const Switch = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-150 ${
        checked ? 'bg-accent' : 'bg-border'
      }`}
    >
      <span
        aria-hidden
        className="pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-150"
        style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }}
      />
    </button>
  )

  if (compact) {
    return (
      <label className="inline-flex items-center gap-2 cursor-pointer select-none whitespace-nowrap">
        {Switch}
        <span className="text-sm">{label}</span>
      </label>
    )
  }

  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
      <span className="text-sm">
        {label}
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      {Switch}
    </label>
  )
}
