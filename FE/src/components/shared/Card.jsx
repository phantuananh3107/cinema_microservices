export default function Card({ title, subtitle, children, footer, className = '', padding = 'p-6' }) {
  return (
    <div className={`bg-white rounded-lg shadow-sm ${padding} ${className}`}>
      {(title || subtitle) && (
        <div className="mb-6">
          {title && <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
      )}

      {children}

      {footer && (
        <>
          <div className="border-t border-gray-200 mt-6 pt-6">{footer}</div>
        </>
      )}
    </div>
  )
}