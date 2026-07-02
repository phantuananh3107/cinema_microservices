export default function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-gray-100 text-gray-700 border-gray-200',
    success: 'bg-green-50 text-green-700 border-green-200',
    warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
  }

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border uppercase tracking-wide ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}
