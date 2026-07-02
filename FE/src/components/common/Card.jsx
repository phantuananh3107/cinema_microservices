export default function Card({ children, className = '', padding = 'md' }) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  )
}
