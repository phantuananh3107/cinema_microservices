export default function MetricCard({ title, value, change, icon, formatValue = (v) => v }) {
  const isPositive = change >= 0
  const isRevenue = title.toLowerCase().includes('revenue')

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex justify-between items-center mb-4">
        <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
          {title}
        </span>
        <span className="text-3xl">{icon}</span>
      </div>

      <div className={`text-3xl font-bold mb-3 leading-tight ${isRevenue ? 'text-green-600' : 'text-gray-900'}`}>
        {formatValue(value)}
      </div>

      <div
        className={`inline-flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-md ${
          isPositive
            ? 'text-green-600 bg-green-50'
            : 'text-red-600 bg-red-50'
        }`}
      >
        <span>{isPositive ? '↑' : '↓'}</span>
        <span>{Math.abs(change).toFixed(1)}%</span>
      </div>
    </div>
  )
}
