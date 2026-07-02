import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import AdminLayout from '../../components/admin/AdminLayout'
import ShowtimeRevenueModal from '../../components/admin/ShowtimeRevenueModal'
import analyticsService from '../../services/analyticsService'
import {
  getLastDaysRange,
  getLastMonthsRange,
  getLastYearsRange,
  getGroupByFromDateRange,
  groupRevenueData
} from '../../utils/dateUtils'

export default function RevenueStatsPage() {
  const [timeSeriesData, setTimeSeriesData] = useState([])
  const [movieData, setMovieData] = useState([])
  const [overallStats, setOverallStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [dateRange, setDateRange] = useState(getLastMonthsRange(6))
  const [tempDateRange, setTempDateRange] = useState(getLastMonthsRange(6))
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [showtimeData, setShowtimeData] = useState([])
  const [showtimeLoading, setShowtimeLoading] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)

        const groupBy = getGroupByFromDateRange(dateRange.startDate, dateRange.endDate)

        const [timeData, movieRevenueData, totalRevenueData] =
          await Promise.all([
            analyticsService.getRevenueByTime(dateRange.startDate, dateRange.endDate, 1000),
            analyticsService.getRevenueByMovie(dateRange.startDate, dateRange.endDate, 10),
            analyticsService.getTotalRevenue(dateRange.startDate, dateRange.endDate),
          ])

        const timeSeriesData = timeData.success && timeData.data
          ? groupRevenueData(timeData.data, groupBy).reverse()
          : []

        const movies =
          movieRevenueData.success && movieRevenueData.data
            ? movieRevenueData.data.map((movie) => ({
              movie_id: movie.movie_id,
              title: movie.movie_title,
              revenue: movie.total_revenue,
              revenueFormatted: formatCurrency(movie.total_revenue),
              ticketsSold: movie.total_tickets,
              genre: 'N/A',
            }))
            : []


        const totalRevenue = totalRevenueData.success ? totalRevenueData.data.total_revenue : 0
        const totalTickets =
          movieRevenueData.success && movieRevenueData.data
            ? movieRevenueData.data.reduce((sum, movie) => sum + movie.total_tickets, 0)
            : 0
        const totalBookings =
          movieRevenueData.success && movieRevenueData.data
            ? movieRevenueData.data.reduce((sum, movie) => sum + movie.total_bookings, 0)
            : 0

        setTimeSeriesData(timeSeriesData)
        setMovieData(movies)
        setOverallStats({
          totalRevenue,
          totalRevenueFormatted: formatCurrency(totalRevenue),
          totalTickets,
          totalBookings,
          averageTicketPriceFormatted:
            totalTickets > 0 ? formatCurrency(totalRevenue / totalTickets) : formatCurrency(0),
        })
      } catch (error) {
        console.error('Error loading revenue data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [dateRange])

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const handleMovieClick = async (movie) => {
    setSelectedMovie(movie)
    setShowtimeLoading(true)

    try {
      const result = await analyticsService.getRevenueByShowtime(
        dateRange.startDate,
        dateRange.endDate,
        movie.movie_id,
        1000,
      )

      if (result.success) {
        setShowtimeData(result.data)
      }
    } catch (error) {
      console.error('Error loading showtime analytics:', error)
      setShowtimeData([])
    } finally {
      setShowtimeLoading(false)
    }
  }

  const handleCloseModal = () => {
    setSelectedMovie(null)
    setShowtimeData([])
  }

  const handleApplyDateRange = () => {
    setDateRange(tempDateRange)
  }

  const handlePresetClick = (range) => {
    setDateRange(range)
    setTempDateRange(range)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleApplyDateRange()
    }
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-md">
          <p className="mb-2 font-semibold text-gray-900 text-sm">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="m-0 text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const tabs = [
    { id: 'overview', label: 'Tổng quan' },
    { id: 'monthly', label: 'Theo thời gian' },
    { id: 'movies', label: 'Theo phim' },
  ]

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center py-16 px-6">
          <div className="w-10 h-10 border-3 border-gray-100 border-t-emerald-500 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-500">Đang tải thống kê doanh thu...</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div>
        <div className="mb-8">
          <h2 className="m-0 mb-2 text-3xl font-bold tracking-tight text-gray-900">Doanh Thu</h2>
          <p className="m-0 text-gray-500 text-sm">Thống kê doanh thu một cách toàn diện</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
          <h3 className="m-0 mb-4 text-lg font-semibold text-gray-900">Chọn khoảng thời gian</h3>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngày bắt đầu
              </label>
              <input
                type="date"
                value={tempDateRange.startDate}
                onChange={(e) => setTempDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                onKeyPress={handleKeyPress}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngày kết thúc
              </label>
              <input
                type="date"
                value={tempDateRange.endDate}
                onChange={(e) => setTempDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                onKeyPress={handleKeyPress}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 opacity-0">
                Áp dụng
              </label>
              <button
                onClick={handleApplyDateRange}
                className="px-6 py-2 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium"
              >
                Áp dụng
              </button>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => handlePresetClick(getLastDaysRange(7))}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              7 ngày
            </button>
            <button
              onClick={() => handlePresetClick(getLastDaysRange(30))}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              30 ngày
            </button>
            <button
              onClick={() => handlePresetClick(getLastMonthsRange(6))}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              6 tháng
            </button>
            <button
              onClick={() => handlePresetClick(getLastYearsRange(1))}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              1 năm
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-6 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-6 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                ? 'bg-gradient-to-br from-emerald-500 to-red-600 text-white font-semibold'
                : 'bg-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="m-0 mb-2 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                  Tổng doanh thu
                </h3>
                <p className="m-0 text-3xl font-bold text-emerald-500">
                  {overallStats.totalRevenueFormatted}
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="m-0 mb-2 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                  Tổng vé bán
                </h3>
                <p className="m-0 text-3xl font-bold text-gray-900">
                  {overallStats.totalTickets?.toLocaleString()}
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="m-0 mb-2 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                  Giá vé trung bình
                </h3>
                <p className="m-0 text-3xl font-bold text-gray-900">
                  {overallStats.averageTicketPriceFormatted}
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="m-0 mb-2 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                  Tổng đơn đặt
                </h3>
                <p className="m-0 text-3xl font-bold text-gray-900">
                  {overallStats.totalBookings?.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="m-0 mb-4 text-lg font-semibold text-gray-900">Xu hướng doanh thu</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="displayName" tick={{ fontSize: 12, fill: '#6B7280' }} stroke="#E5E7EB" />
                    <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12, fill: '#6B7280' }} stroke="#E5E7EB" />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10B981"
                      strokeWidth={3}
                      dot={{ fill: '#FFFFFF', stroke: '#10B981', strokeWidth: 2, r: 5 }}
                      name="Doanh thu"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'monthly' && (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="m-0 mb-4 text-lg font-semibold text-gray-900">
              Doanh Thu Theo Thời Gian
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="displayName" tick={{ fontSize: 12, fill: '#6B7280' }} stroke="#E5E7EB" />
                <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12, fill: '#6B7280' }} stroke="#E5E7EB" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 14 }} />
                <Bar dataKey="revenue" fill="#10B981" name="Doanh thu" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 'movies' && (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="m-0 mb-4 text-lg font-semibold text-gray-900">
              Doanh Thu Theo Phim
            </h3>
            {movieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={500}>
                <BarChart data={movieData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis
                    dataKey="title"
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    height={100}
                    stroke="#E5E7EB"
                  />
                  <YAxis
                    tickFormatter={formatCurrency}
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    stroke="#E5E7EB"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 14 }} />
                  <Bar dataKey="revenue" fill="#10B981" name="Doanh thu" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-16">
                <p className="text-gray-500">Không có dữ liệu doanh thu theo phim</p>
              </div>
            )}

            <div className="mt-8">
              <h4 className="m-0 mb-1 text-base font-semibold text-gray-900">
                Chi Tiết Doanh Thu Theo Phim
              </h4>
              <p className="text-sm text-gray-500 m-0 mb-4">
                Click để xem chi tiết
              </p>
              <div className="overflow-x-auto border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-4 text-left border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Phim
                      </th>
                      <th className="px-4 py-4 text-right border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Doanh thu
                      </th>
                      <th className="px-4 py-4 text-right border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Vé bán
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {movieData.map((movie, index) => (
                      <tr
                        key={index}
                        onClick={() => handleMovieClick(movie)}
                        className="cursor-pointer transition-colors border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="px-4 py-4 text-sm text-gray-900">{movie.title}</td>
                        <td className="px-4 py-4 text-right text-sm font-semibold text-gray-900">
                          {movie.revenueFormatted}
                        </td>
                        <td className="px-4 py-4 text-right text-sm text-gray-900">
                          {movie.ticketsSold.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      {selectedMovie && (
        <ShowtimeRevenueModal
          movie={selectedMovie}
          showtimes={showtimeData}
          dateRange={dateRange}
          onClose={handleCloseModal}
          formatCurrency={formatCurrency}
          loading={showtimeLoading}
        />
      )}
    </AdminLayout>
  )
}