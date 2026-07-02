import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FaArrowLeft } from 'react-icons/fa'
import Header from '../../components/Header'
import PaymentMethods from '../../components/payment/PaymentMethods'
import { bookingService } from '../../services/bookingService'
import apiClient from '../../services/apiClient'

const PaymentPage = () => {
  const { bookingId } = useParams()
  const navigate = useNavigate()

  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchBooking().then()
  }, [bookingId])

  const fetchBooking = async () => {
    try {
      setLoading(true)
      const bookingResponse = await bookingService.getBookingById(bookingId)

      if (!bookingResponse.data || bookingResponse.code !== 200) {
        setError('Không tìm thấy booking')
        return
      }

      setBooking(bookingResponse.data)

      try {
        await apiClient.post('/payments', {
          booking_id: bookingId,
          amount: bookingResponse.data.total_amount,
        })
      } catch (paymentErr) {
        console.error('Error creating payment:', paymentErr)
      }
    } catch (err) {
      console.error('Error fetching booking:', err)
      setError('Có lỗi xảy ra khi tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentSuccess = () => {
    navigate(`/booking-success?bookingId=${bookingId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors duration-300"
          >
            Quay lại
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <Header />

      <div className="bg-gray-900 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors duration-300"
            >
              <FaArrowLeft />
              Quay lại
            </button>
            <h1 className="text-xl font-semibold text-white">Thanh toán</h1>
            <div className="w-24"></div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PaymentMethods
          booking={booking}
          isBoxOffice={false}
          onPaymentSuccess={handlePaymentSuccess}
        />

        {booking && (
          <div className="mt-8 bg-gray-900 rounded-xl shadow-lg p-6 border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-4">Thông tin đặt vé</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Mã booking</p>
                <p className="text-white font-semibold">{booking.id}</p>
              </div>
              <div>
                <p className="text-gray-400">Tổng tiền</p>
                <p className="text-red-400 font-bold">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(booking.total_amount)}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Trạng thái</p>
                <p className="text-yellow-400 font-semibold capitalize">{booking.status}</p>
              </div>
              <div>
                <p className="text-gray-400">Thời gian tạo</p>
                <p className="text-white font-semibold">
                  {new Date(booking.created_at).toLocaleString('vi-VN')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PaymentPage
