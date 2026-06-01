export default function LoadingSpinner({ size = 'md', text }) {
  const sizes = {
    sm: 'h-6 w-6 border-2',
    md: 'h-12 w-12 border-b-2',
    lg: 'h-16 w-16 border-b-3'
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div className={`animate-spin rounded-full ${sizes[size]} border-[#15A780]`}></div>
      {text && <p className="text-[#A8B2C1] text-sm">{text}</p>}
    </div>
  )
}

export function PageLoader({ text = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <LoadingSpinner size="lg" text={text} />
    </div>
  )
}

export function CardSkeleton({ count = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card animate-pulse">
          <div className="h-4 bg-[#1C2840] rounded w-3/4 mb-3"></div>
          <div className="h-3 bg-[#1C2840] rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-[#1C2840] rounded w-1/3"></div>
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="animate-pulse">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 py-3 border-b border-[#1C2840]">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="h-4 bg-[#1C2840] rounded flex-1"></div>
          ))}
        </div>
      ))}
    </div>
  )
}
