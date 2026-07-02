export default function MetricCardSkeleton() {
  return (
    <div className="rounded-xl p-6 h-[140px] bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse">
      <div className="h-5 w-3/5 bg-gray-300 rounded mb-3" />
      <div className="h-10 w-4/5 bg-gray-300 rounded mb-2" />
      <div className="h-6 w-1/2 bg-gray-300 rounded" />
    </div>
  )
}
