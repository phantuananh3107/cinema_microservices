export default function LoadingSpinner({ size = 'md', text = '' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  }

  return (
    <div className="flex justify-center items-center py-12">
      <div className="text-center">
        <div className={`${sizeClasses[size]} animate-spin rounded-full border-b-2 border-blue-600 mx-auto`}></div>
        {text && <p className="mt-4 text-gray-600">{text}</p>}
      </div>
    </div>
  )
}