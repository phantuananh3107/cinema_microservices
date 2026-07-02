export default function EmptyState({ icon: Icon, title, message, actionLabel, onAction }) {
  return (
    <div className="text-center py-12">
      {Icon && <Icon className="mx-auto text-gray-400 text-4xl mb-4" />}
      {title && <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>}
      {message && <p className="text-gray-500 mb-6">{message}</p>}
      {onAction && actionLabel && (
        <button
          onClick={onAction}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}