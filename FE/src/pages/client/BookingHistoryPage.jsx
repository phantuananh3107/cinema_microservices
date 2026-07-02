import { useEffect, useState } from 'react'
import { FaArrowLeft, FaCalendarAlt, FaClock, FaMapMarkerAlt, FaTicketAlt, FaFilter, FaSearch } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/Header'
import { bookingService } from '../../services/bookingService'

export default function BookingHistoryPage() {
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchBookings().then()
  }, [currentPage, statusFilter])

  const fetchBookings = async () => {
    try {
      setLoading(true)
      const user = JSON.parse(localStorage.getItem('user'))
      if (!user?.id) {
        setError('Vui lòng đăng nhập để xem lịch sử đặt vé')
        return
      }

      const response = await bookingService.getUserBookings(currentPage, 10, statusFilter)
      if (response.code === 200) {
        setBookings(response.data.bookings || [])
        setTotalPages(Math.ceil((response.data.total || 0) / 10))
      }
    } catch (err) {
      setError('Có lỗi xảy ra khi tải dữ liệu')
      console.error('Error fetching bookings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusFilter = (status) => {
    setStatusFilter(status)
    setCurrentPage(1)
  }

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
  }

  const filteredBookings = bookings.filter(booking =>
    booking.movie_title?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-600/20 text-green-400 border-green-600/30'
      case 'PENDING':
        return 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30'
      case 'CANCELED':
        return 'bg-red-600/20 text-red-400 border-red-600/30'
      default:
        return 'bg-gray-600/20 text-gray-400 border-gray-600/30'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'confirmed':
        return 'Đã xác nhận'
      case 'pending':
        return 'Đang chờ'
      case 'cancelled':
        return 'Đã hủy'
      default:
        return status
    }
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN')
  }

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-red-900/20 border border-red-700 text-red-400 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <Header />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="text-gray-300 hover:text-white transition-colors duration-300"
            >
              <FaArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-3xl font-bold text-white">Lịch sử đặt vé</h1>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-900 rounded-xl p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên phim..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-3 bg-black border border-gray-600 text-white rounded-lg focus:outline-none focus:border-red-600"
              />
            </div>

            {/* Status Filter */}
            <div className="flex space-x-2">
              <button
                onClick={() => handleStatusFilter('')}
                className={`px-4 py-3 rounded-lg font-medium transition-colors duration-300 ${
                  statusFilter === '' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => handleStatusFilter('confirmed')}
                className={`px-4 py-3 rounded-lg font-medium transition-colors duration-300 ${
                  statusFilter === 'confirmed' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Đã xác nhận
              </button>
              <button
                onClick={() => handleStatusFilter('pending')}
                className={`px-4 py-3 rounded-lg font-medium transition-colors duration-300 ${
                  statusFilter === 'pending' 
                    ? 'bg-yellow-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Đang chờ
              </button>
              <button
                onClick={() => handleStatusFilter('cancelled')}
                className={`px-4 py-3 rounded-lg font-medium transition-colors duration-300 ${
                  statusFilter === 'cancelled' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Đã hủy
              </button>
            </div>
          </div>
        </div>

        {/* Bookings List */}
        <div className="space-y-6">
          {filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <FaTicketAlt className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-300 mb-2">Chưa có đặt vé nào</h3>
              <p className="text-gray-500">Hãy đặt vé để xem lịch sử ở đây</p>
            </div>
          ) : (
            filteredBookings.map((booking) => (
              <div key={booking.id} className="bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-gray-700 transition-colors duration-300">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-2">
                          {booking.movie_title || 'Phim không xác định'}
                        </h3>
                        <div className="flex items-center space-x-4 text-gray-400 text-sm">
                          <div className="flex items-center space-x-1">
                            <FaCalendarAlt className="w-4 h-4" />
                            <span>{booking.showtime_date ? formatDate(booking.showtime_date) : 'N/A'}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <FaClock className="w-4 h-4" />
                            <span>{booking.showtime_time ? formatTime(booking.showtime_time) : 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                      <span className={`px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(booking.status)}`}>
                        {getStatusText(booking.status)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-gray-400 text-sm mb-1">Ghế ngồi</p>
                        <p className="text-white font-medium">{booking.seat_numbers || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm mb-1">Tổng tiền</p>
                        <p className="text-red-400 font-bold text-lg">{formatPrice(booking.total_amount || 0)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm mb-1">Ngày đặt</p>
                        <p className="text-white font-medium">
                          {booking.created_at ? formatDate(booking.created_at) : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300"
              >
                Trước
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors duration-300 ${
                    currentPage === page
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
