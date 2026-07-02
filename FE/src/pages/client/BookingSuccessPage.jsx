import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FaCheckCircle, FaTicketAlt, FaEnvelope, FaHome } from 'react-icons/fa'
import Header from '../../components/Header'
import { bookingService } from '../../services/bookingService'

const BookingSuccessPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const bookingId = searchParams.get('bookingId')

  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (bookingId) {
      fetchBooking()
    } else {
      setLoading(false)
    }
  }, [bookingId])

  const fetchBooking = async () => {
    try {
      setLoading(true)
      const response = await bookingService.getBookingById(bookingId)
      if (response.code === 200 && response.data) {
        setBooking(response.data)
      }
    } catch (error) {
      console.error('Error fetching booking:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <Header />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-green-900/30 rounded-full border-4 border-green-500 mb-6 animate-bounce">
            <FaCheckCircle className="text-green-500 text-5xl" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">Đặt vé thành công!</h1>
          <p className="text-gray-400 text-lg">
            Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi
          </p>
        </div>

        {/* Booking Details Card */}
        <div className="bg-gray-900 rounded-xl shadow-lg p-8 border border-gray-800 mb-6">
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-700">
            <FaTicketAlt className="text-red-500 text-2xl" />
            <h2 className="text-2xl font-semibold text-white">Thông tin đặt vé</h2>
          </div>

          {booking ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">Mã booking</p>
                  <p className="text-white font-semibold break-all">{booking.id}</p>
                </div>

                <div className="bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">Trạng thái</p>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <p className="text-green-400 font-bold uppercase">{booking.status}</p>
                  </div>
                </div>

                <div className="bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">Tổng tiền</p>
                  <p className="text-red-400 font-bold text-xl">{formatPrice(booking.total_amount)}</p>
                </div>

                <div className="bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">Thời gian đặt</p>
                  <p className="text-white font-semibold">
                    {new Date(booking.created_at).toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400">Không tìm thấy thông tin booking</p>
            </div>
          )}
        </div>

        {/* Email Notification */}
        <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-4">
            <FaEnvelope className="text-blue-400 text-2xl mt-1" />
            <div>
              <h3 className="text-white font-semibold mb-2">Email xác nhận đã được gửi</h3>
              <p className="text-gray-300 text-sm">
                Chúng tôi đã gửi email xác nhận kèm theo mã vạch (barcode) đến địa chỉ email của bạn.
                Vui lòng kiểm tra hộp thư đến hoặc thư spam.
              </p>
              <p className="text-gray-400 text-xs mt-2">
                💡 Bạn cần xuất trình mã vạch này tại quầy để nhận vé
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/booking-history')}
            className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-300"
          >
            <FaTicketAlt />
            Lịch sử đặt vé
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-300"
          >
            <FaHome />
            Về trang chủ
          </button>
        </div>

        {/* Additional Info */}
        <div className="mt-8 bg-gray-800/50 rounded-lg p-6 border border-gray-700">
          <h3 className="text-white font-semibold mb-3">Lưu ý quan trọng:</h3>
          <ul className="space-y-2 text-gray-300 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-1">•</span>
              <span>Vui lòng đến rạp trước giờ chiếu ít nhất 15 phút để nhận vé</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-1">•</span>
              <span>Mang theo mã vạch trong email để xuất trình tại quầy</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-1">•</span>
              <span>Không hoàn tiền sau khi đã thanh toán thành công</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-1">•</span>
              <span>Liên hệ hotline nếu bạn không nhận được email xác nhận</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default BookingSuccessPage