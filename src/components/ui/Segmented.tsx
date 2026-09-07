interface SegmentedProps<T extends string | number> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  size?: 'sm' | 'md'
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  size = 'md',
}: SegmentedProps<T>) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-md transition-colors ${
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'
          } ${
            opt.value === value
              ? 'bg-surface-2 text-text'
              : 'text-muted hover:text-text'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
