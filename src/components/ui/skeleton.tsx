type Props = {
  className?: string
  style?: React.CSSProperties
}

export function Skeleton({ className = '', style }: Props) {
  return (
    <div
      className={`animate-pulse bg-[var(--muted-soft)] rounded ${className}`}
      style={style}
      aria-hidden
    />
  )
}
