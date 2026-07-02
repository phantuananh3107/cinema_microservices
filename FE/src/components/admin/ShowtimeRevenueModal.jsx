import { useEffect, useState } from 'react'
import LoadingSpinner from '../common/LoadingSpinner'

export default function ShowtimeRevenueModal({
  movie,
  showtimes,
  dateRange,
  onClose,
  formatCurrency,
  loading,
}) {
  const [sortedShowtimes, setSortedShowtimes] = useState([])

  useEffect(() => {
    if (showtimes && showtimes.length > 0) {
      const sorted = [...showtimes].sort((a, b) => b.total_revenue - a.total_revenue)
      setSortedShowtimes(sorted)
    } else {
      setSortedShowtimes([])
    }
  }, [showtimes])

  const summaryStats = {
    totalRevenue: sortedShowtimes.reduce((sum, st) => sum + st.total_revenue, 0),
    totalTickets: sortedShowtimes.reduce((sum, st) => sum + st.total_tickets, 0),
    totalShowtimes: sortedShowtimes.length,
    avgOccupancy:
      sortedShowtimes.length > 0
        ? sortedShowtimes.reduce((sum, st) => sum + st.occupancy_rate, 0) / sortedShowtimes.length
        : 0,
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('vi-VN')
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const getOccupancyBadgeClass = (rate) => {
    if (rate >= 80) return 'bg-green-50 text-green-700 border-green-300'
    if (rate >= 50) return 'bg-amber-50 text-amber-700 border-amber-300'
    return 'bg-red-50 text-red-700 border-red-300'
  }

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-5"
    >
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-6 flex justify-between items-center z-10 rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              {movie.title}
            </h2>
            <p className="mt-1 text-gray-500 text-sm">
              {formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:bg-gray-100 hover:text-gray-600 text-2xl leading-none p-0 w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-150"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-16 px-6">
              <LoadingSpinner text="Loading showtime analytics..." />
            </div>
          ) : sortedShowtimes.length === 0 ? (
            <div className="text-center py-16 px-6 text-gray-400">
              <p>No showtime data available for this movie in the selected date range</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="mb-2 text-gray-500 text-xs font-semibold tracking-wider uppercase">
                    Tổng doanh thu
                  </h3>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatCurrency(summaryStats.totalRevenue)}
                  </p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="mb-2 text-gray-500 text-xs font-semibold tracking-wider uppercase">
                    Tổng vé
                  </h3>
                  <p className="text-3xl font-bold text-gray-900">
                    {summaryStats.totalTickets.toLocaleString()}
                  </p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="mb-2 text-gray-500 text-xs font-semibold tracking-wider uppercase">
                    Tổng suất chiếu
                  </h3>
                  <p className="text-3xl font-bold text-gray-900">
                    {summaryStats.totalShowtimes}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <h3 className="m-0 px-6 py-5 border-b border-gray-200 text-lg font-semibold text-gray-900">
                  Chi tiết suất chiếu
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-4 text-left border-b border-gray-200 text-xs font-semibold text-gray-500 tracking-wider uppercase">
                          Ngày
                        </th>
                        <th className="px-4 py-4 text-left border-b border-gray-200 text-xs font-semibold text-gray-500 tracking-wider uppercase">
                          Giờ
                        </th>
                        <th className="px-4 py-4 text-left border-b border-gray-200 text-xs font-semibold text-gray-500 tracking-wider uppercase">
                          Phòng
                        </th>
                        <th className="px-4 py-4 text-right border-b border-gray-200 text-xs font-semibold text-gray-500 tracking-wider uppercase">
                          Doanh thu
                        </th>
                        <th className="px-4 py-4 text-right border-b border-gray-200 text-xs font-semibold text-gray-500 tracking-wider uppercase">
                          Vé
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedShowtimes.map((showtime) => (
                        <tr
                          key={showtime.showtime_id}
                          className="border-b border-gray-100 transition-colors duration-150 hover:bg-gray-50"
                        >
                          <td className="px-4 py-4 text-sm text-gray-900">
                            {formatDate(showtime.showtime_date)}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">
                            {showtime.showtime_time}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">
                            {showtime.room_number}
                          </td>
                          <td className="px-4 py-4 text-right text-sm font-semibold text-gray-900">
                            {formatCurrency(showtime.total_revenue)}
                          </td>
                          <td className="px-4 py-4 text-right text-sm text-gray-900">
                            {showtime.total_tickets.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
