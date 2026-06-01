export default function ErrorAlert({ message, onRetry, onDismiss }) {
  if (!message) return null

  return (
    <div className="bg-[rgba(251,113,133,0.1)] border border-[#BE123C]/40 text-[#FB7185] rounded-lg px-4 py-3 mb-4 text-sm flex items-start gap-3">
      <span className="text-lg leading-none mt-px">&#9888;</span>
      <div className="flex-1">
        <p>{message}</p>
        <div className="flex gap-2 mt-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-xs bg-[rgba(251,113,133,0.1)] hover:bg-[#3A2E2E] px-3 py-1 rounded-md transition-colors"
            >
              Retry
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-xs text-[#94A3B8] hover:text-[#A8B2C1] px-3 py-1 transition-colors"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="text-center py-16">
      {icon && <div className="text-4xl mb-4">{icon}</div>}
      <h3 className="text-lg font-semibold text-[#C7CBD6] mb-1">{title}</h3>
      {description && <p className="text-[#94A3B8] text-sm mb-4">{description}</p>}
      {action}
    </div>
  )
}