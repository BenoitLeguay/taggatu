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
  const Switch = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
        checked ? 'bg-accent' : 'bg-border'
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
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
