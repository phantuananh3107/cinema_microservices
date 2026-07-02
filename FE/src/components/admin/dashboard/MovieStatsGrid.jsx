import LoadingSpinner from '../../common/LoadingSpinner'

export default function MovieStatsGrid({ stats, loading }) {
  const statsData = [
    {
      label: 'Tổng số phim',
      value: stats.total,
      colorClass: 'text-red-600',
      bgClass: 'bg-red-50',
      borderClass: 'border-red-200',
    },
    {
      label: 'Đang chiếu',
      value: stats.by_status?.showing || 0,
      colorClass: 'text-green-600',
      bgClass: 'bg-green-50',
      borderClass: 'border-green-200',
    },
    {
      label: 'Sắp chiếu',
      value: stats.by_status?.upcoming || 0,
      colorClass: 'text-amber-600',
      bgClass: 'bg-amber-50',
      borderClass: 'border-amber-200',
    },
    {
      label: 'Đã kết thúc',
      value: stats.by_status?.ended || 0,
      colorClass: 'text-gray-600',
      bgClass: 'bg-gray-100',
      borderClass: 'border-gray-200',
    },
  ]

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <h3 className="mb-6 text-lg font-semibold text-gray-900">
        Thống kê phim
      </h3>

      {loading ? (
        <div className="text-center py-16 px-6">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {statsData.map((stat, idx) => (
            <div
              key={idx}
              className={`py-5 px-4 ${stat.bgClass} border ${stat.borderClass} rounded-lg text-center transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md`}
            >
              <div className={`text-3xl font-bold ${stat.colorClass} leading-tight`}>
                {stat.value}
              </div>
              <div className="text-xs text-gray-500 mt-2 font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
