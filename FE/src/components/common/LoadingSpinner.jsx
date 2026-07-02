export default function LoadingSpinner({ size = 'md', text = '' }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-16 h-16 border-4',
  }

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className={`${sizes[size]} border-gray-200 border-t-red-600 rounded-full animate-spin`}></div>
      {text && <p className="mt-4 text-gray-600">{text}</p>}
    </div>
  )
}
