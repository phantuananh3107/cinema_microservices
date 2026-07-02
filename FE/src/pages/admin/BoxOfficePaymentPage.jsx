import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FaArrowLeft } from 'react-icons/fa'
import AdminLayout from '../../components/admin/AdminLayout'
import PaymentMethods from '../../components/payment/PaymentMethods'
import { bookingService } from '../../services/bookingService'
import apiClient from '../../services/apiClient'

const BoxOfficePaymentPage = () => {
  const { bookingId } = useParams()
  const navigate = useNavigate()

  const [booking, setBooking] = useState(null)
  const [payment, setPayment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchBookingAndPayment().then()
  }, [bookingId])

  const fetchBookingAndPayment = async () => {
    try {
      setLoading(true)

      const bookingResponse = await bookingService.getBookingById(bookingId)
      if (!bookingResponse.data || bookingResponse.code !== 200) {
        setError('Không tìm thấy booking')
        return
      }

      setBooking(bookingResponse.data)

      try {
        const createPaymentResponse = await apiClient.post('/payments', {
          booking_id: bookingId,
          amount: bookingResponse.data.total_amount,
        })
        if (createPaymentResponse.data && createPaymentResponse.data.success) {
          setPayment(createPaymentResponse.data.data)
        }
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

  const handleManualConfirm = async (paymentMethod) => {
    if (!payment) {
      throw new Error('Payment not found')
    }

    const response = await apiClient.patch(`/payments/${payment.id}/confirm`, {
      payment_method: paymentMethod,
    })

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.message || 'Failed to confirm payment')
    }

    return response.data
  }

  const handlePaymentSuccess = () => {
    navigate(`/admin/ticket-search?bookingId=${bookingId}`)
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => navigate('/admin/box-office')}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors duration-300"
            >
              Quay lại
            </button>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-lg border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <button
                onClick={() => navigate('/admin/box-office')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors duration-300"
              >
                <FaArrowLeft />
                Quay lại
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Thanh toán vé</h1>
              <div className="w-24"></div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PaymentMethods
            booking={booking}
            isBoxOffice={true}
            onManualConfirm={handleManualConfirm}
            onPaymentSuccess={handlePaymentSuccess}
            theme="light"
          />

          {booking && (
            <div className="mt-8 bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin đặt vé</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Mã booking</p>
                  <p className="text-gray-900 font-semibold">{booking.id}</p>
                </div>
                <div>
                  <p className="text-gray-600">Tổng tiền</p>
                  <p className="text-red-600 font-bold">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(booking.total_amount)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Trạng thái</p>
                  <p className="text-yellow-600 font-semibold capitalize">{booking.status}</p>
                </div>
                <div>
                  <p className="text-gray-600">Loại đặt vé</p>
                  <p className="text-gray-900 font-semibold capitalize">{booking.booking_type}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

export default BoxOfficePaymentPage
