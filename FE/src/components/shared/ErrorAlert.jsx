import { FaExclamationCircle, FaInfoCircle, FaCheckCircle } from 'react-icons/fa'

export default function ErrorAlert({ type = 'error', title, message, onRetry, children }) {
  const typeConfig = {
    error: {
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-700',
      icon: FaExclamationCircle,
      iconColor: 'text-red-500',
    },
    warning: {
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-700',
      icon: FaExclamationCircle,
      iconColor: 'text-yellow-500',
    },
    success: {
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-700',
      icon: FaCheckCircle,
      iconColor: 'text-green-500',
    },
    info: {
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700',
      icon: FaInfoCircle,
      iconColor: 'text-blue-500',
    },
  }

  const config = typeConfig[type]
  const Icon = config.icon

  return (
    <div className={`${config.bgColor} border border-l-4 ${config.borderColor} ${config.textColor} px-4 py-3 rounded-lg`}>
      <div className="flex items-start gap-3">
        <Icon className={`${config.iconColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          {title && <h3 className="font-semibold mb-1">{title}</h3>}
          {message && <p className="text-sm">{message}</p>}
          {children}
          {onRetry && (
            <button
              onClick={onRetry}
              className={`mt-3 px-4 py-2 text-sm font-medium ${config.textColor} border border-current rounded hover:opacity-80`}
            >
              Thử lại
            </button>
          )}
        </div>
      </div>
    </div>
  )
}