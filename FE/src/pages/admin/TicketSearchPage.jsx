import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FaSearch, FaTicketAlt, FaFilm, FaClock, FaCheckCircle, FaTimesCircle } from 'react-icons/fa'
import AdminLayout from '../../components/admin/AdminLayout'
import TicketModal from '../../components/admin/TicketModal'
import { bookingService } from '../../services/bookingService'
import { showtimeService } from '../../services/showtimeApi'
import { formatCurrency, formatDateTime } from '../../utils/formatters'

const TicketSearchPage = () => {
  const [searchParams] = useSearchParams()
  const [searchType, setSearchType] = useState('booking_id')
  const [searchValue, setSearchValue] = useState('')
  const [showtimes, setShowtimes] = useState([])
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showTicketModal, setShowTicketModal] = useState(false)
  const [exportedTicket, setExportedTicket] = useState(null)

  useEffect(() => {
    fetchScheduledShowtimes().then()

    const bookingIdFromUrl = searchParams.get('bookingId')
    if (bookingIdFromUrl) {
      setSearchType('booking_id')
      setSearchValue(bookingIdFromUrl)
      searchByBookingId(bookingIdFromUrl).then()
    }
  }, [])

  const fetchScheduledShowtimes = async () => {
    try {
      const response = await showtimeService.getShowtimes(1, 100, '', '', '', '', 'scheduled', '', '')
      if (response.success && response.data) {
        const showtimesData = Array.isArray(response.data) ? response.data :
                             Array.isArray(response.data.data) ? response.data.data : []
        setShowtimes(showtimesData)
      }
    } catch (err) {
      console.error('Error fetching showtimes:', err)
    }
  }

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

  const searchByBookingId = async (bookingId) => {
    try {
      setLoading(true)
      setError('')
      setSuccess('')

      await delay(1500)

      const response = await bookingService.searchTickets(bookingId, '')

      if (response.code !== 200 || !response.data) {
        setError('Không thể tìm kiếm vé')
        return
      }

      const ticketsData = response.data.tickets || []
      setTickets(ticketsData)

      if (ticketsData.length === 0) {
        setError('Không tìm thấy vé')
      }
    } catch (err) {
      setError('Có lỗi xảy ra khi tìm kiếm vé')
      console.error('Error searching tickets:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!searchValue) {
      setError('Vui lòng nhập giá trị tìm kiếm')
      return
    }

    try {
      setLoading(true)

      await delay(1500)

      const response = await bookingService.searchTickets(
        searchType === 'booking_id' ? searchValue : '',
        searchType === 'showtime_id' ? searchValue : ''
      )

      if (response.code !== 200 || !response.data) {
        setError('Không thể tìm kiếm vé')
        return
      }

      const ticketsData = response.data.tickets || []
      setTickets(ticketsData)

      if (ticketsData.length === 0) {
        setError('Không tìm thấy vé')
      }
    } catch (err) {
      setError('Có lỗi xảy ra khi tìm kiếm vé')
      console.error('Error searching tickets:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleExportTicket = async (ticketId) => {
    const confirmed = window.confirm('Bạn có chắc chắn muốn xuất vé này? Vé sẽ được đánh dấu là đã sử dụng.')
    if (!confirmed) {
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')

      const response = await bookingService.markTicketAsUsed(ticketId)

      if (response.code === 200) {
        setSuccess('Xuất vé thành công!')

        const ticket = tickets.find(t => t.id === ticketId)

        if (ticket) {
          setExportedTicket(ticket)
          setShowTicketModal(true)
        }

        setTickets(tickets.map(t =>
          t.id === ticketId ? { ...t, status: 'USED' } : t
        ))
      } else {
        setError('Không thể xuất vé')
      }
    } catch (err) {
      setError('Có lỗi xảy ra khi xuất vé')
      console.error('Error marking ticket as used:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <FaTicketAlt className="text-2xl text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Xuất Vé</h1>
              <p className="text-sm text-gray-600 mt-1">Tìm kiếm và xuất vé cho khách hàng</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <FaTimesCircle className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <FaCheckCircle className="flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tìm kiếm</h2>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loại tìm kiếm
                </label>
                <select
                  value={searchType}
                  onChange={(e) => {
                    setSearchType(e.target.value)
                    setSearchValue('')
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="booking_id">Mã đặt vé</option>
                  <option value="showtime_id">Suất chiếu</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {searchType === 'booking_id' ? 'Mã đặt vé' : 'Suất chiếu'}
                </label>
                {searchType === 'booking_id' ? (
                  <input
                    type="text"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    placeholder="Nhập mã đặt vé"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                ) : (
                  <select
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="">Chọn suất chiếu</option>
                    {showtimes.map((showtime) => (
                      <option key={showtime.id} value={showtime.id}>
                        {showtime.movie?.title || 'N/A'} - {formatDateTime(showtime.start_time)} - {showtime.room?.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition-colors"
                >
                  <FaSearch />
                  Tìm kiếm
                </button>
              </div>
            </div>
          </form>
        </div>

        {tickets.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <FaTicketAlt className="text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Kết quả tìm kiếm ({tickets.length} vé)
              </h2>
            </div>

            <div className="space-y-3">
              {tickets.map((ticket) => {
                const isUsed = ticket.status === 'USED'

                return (
                  <div
                    key={ticket.id}
                    className={`border rounded-lg p-4 transition-all ${
                      isUsed
                        ? 'border-gray-200 bg-gray-50'
                        : 'border-blue-200 bg-blue-50/30 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-gray-500">Mã vé:</span>
                          <span className="font-mono text-sm font-semibold text-blue-700 bg-blue-100 px-2.5 py-1 rounded">
                            {ticket.id}
                          </span>
                          {isUsed ? (
                            <span className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                              <FaTimesCircle />
                              Đã sử dụng
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-600 rounded-full text-xs font-medium">
                              <FaCheckCircle />
                              Chưa sử dụng
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {ticket.movie_title && (
                            <div className="flex items-center gap-2 text-sm">
                              <FaFilm className="text-blue-500 flex-shrink-0" />
                              <span className="font-medium text-gray-600">Phim:</span>
                              <span className="text-gray-900 truncate">{ticket.movie_title}</span>
                            </div>
                          )}
                          {ticket.showtime_date && ticket.showtime_time && (
                            <div className="flex items-center gap-2 text-sm">
                              <FaClock className="text-blue-500 flex-shrink-0" />
                              <span className="font-medium text-gray-600">Suất chiếu:</span>
                              <span className="text-gray-900">{ticket.showtime_date} {ticket.showtime_time}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium text-gray-600">Ghế:</span>
                            <span className="text-gray-900 font-semibold">
                              {ticket.seat_row}{ticket.seat_number}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium text-gray-600">Loại ghế:</span>
                            <span className="text-gray-900">{ticket.seat_type || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium text-gray-600">Loại đặt:</span>
                            <span className="text-gray-900">{ticket.booking_type || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium text-gray-600">Tổng tiền:</span>
                            <span className="text-gray-900 font-semibold">{formatCurrency(ticket.total_amount)}</span>
                          </div>
                        </div>
                      </div>

                      {!isUsed && (
                        <button
                          onClick={() => handleExportTicket(ticket.id)}
                          disabled={loading}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm font-medium whitespace-nowrap"
                        >
                          <FaTicketAlt />
                          Xuất vé
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <TicketModal
          ticket={exportedTicket}
          isOpen={showTicketModal}
          onClose={() => {
            setShowTicketModal(false)
            setExportedTicket(null)
          }}
        />
      </div>
    </AdminLayout>
  )
}

export default TicketSearchPage
