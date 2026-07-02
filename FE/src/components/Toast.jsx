import { useEffect } from 'react'
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from 'react-icons/fa'

const Toast = ({ message, type = 'info', onClose, duration = 5000, txHash = null }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <FaCheckCircle className="text-2xl text-green-400" />
      case 'error':
        return <FaExclamationCircle className="text-2xl text-red-400" />
      case 'warning':
        return <FaExclamationCircle className="text-2xl text-yellow-400" />
      default:
        return <FaInfoCircle className="text-2xl text-blue-400" />
    }
  }

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-900/90 border-green-600'
      case 'error':
        return 'bg-red-900/90 border-red-600'
      case 'warning':
        return 'bg-yellow-900/90 border-yellow-600'
      default:
        return 'bg-blue-900/90 border-blue-600'
    }
  }

  return (
    <div className="fixed top-20 right-4 z-[100] animate-slide-in-right">
      <div
        className={`${getBgColor()} backdrop-blur-sm border-2 rounded-lg shadow-2xl p-4 min-w-[320px] max-w-md`}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
          <div className="flex-1">
            <p className="text-white font-medium text-sm leading-relaxed">{message}</p>
            {txHash && (
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-xs mt-2 inline-block underline"
              >
                View on Etherscan →
              </a>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-gray-400 hover:text-white transition-colors duration-200"
          >
            <FaTimes />
          </button>
        </div>
      </div>
    </div>
  )
}

export default Toast