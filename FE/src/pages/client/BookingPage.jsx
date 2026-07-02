import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaShoppingCart, FaCreditCard } from 'react-icons/fa'
import Header from '../../components/Header'
import SeatGrid from '../../components/SeatGrid'
import { showtimeService } from '../../services/showtimeApi'
import { bookingService } from '../../services/bookingService'
import { getSeatTypeLabel, getSeatPrice, calculateBookingTotal } from '../../constants/seatConstants'
import { formatPrice } from '../../utils/formatters'
import { isSeatClickable } from '../../utils/seatUtils'
import { useLockedSeats } from '../../hooks/useLockedSeats'

const BookingPage = () => {
  const { showtimeId } = useParams()
  const navigate = useNavigate()

  const [movie, setMovie] = useState(null)
  const [showtime, setShowtime] = useState(null)
  const [room, setRoom] = useState(null)
  const [seats, setSeats] = useState([])
  const [selectedSeats, setSelectedSeats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1)

  const { lockedSeats, bookedSeats } = useLockedSeats(
    showtimeId,
    seats,
    selectedSeats,
    setSelectedSeats,
    step === 1
  )

  useEffect(() => {
    fetchBookingData().then()
  }, [showtimeId])

  const fetchBookingData = async () => {
    try {
      setLoading(true)
      
      const showtimeResponse = await showtimeService.getShowtimeById(showtimeId)
      if (showtimeResponse.success) {
        const showtimeData = showtimeResponse.data
        setShowtime(showtimeData)
        setMovie(showtimeData.movie)
        setRoom(showtimeData.room)
        setSeats(showtimeData.seats || [])
      } else {
        setError('Không tìm thấy suất chiếu')
      }
    } catch (err) {
      setError('Có lỗi xảy ra khi tải dữ liệu')
      console.error('Error fetching booking data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSeatClick = (seat) => {
    if (!isSeatClickable(seat, lockedSeats, bookedSeats)) {
      return
    }

    const isSelected = selectedSeats.some(s => s.id === seat.id)

    if (isSelected) {
      setSelectedSeats(selectedSeats.filter(s => s.id !== seat.id))
    } else {
      if (selectedSeats.length >= 10) {
        alert('Không được đặt nhiều hơn 10 ghế cùng một lúc')
        return
      }
      setSelectedSeats([...selectedSeats, seat])
    }
  }

  const getPrice = (seatType) => {
    if (!showtime || !showtime.base_price) return 0
    return getSeatPrice(seatType, showtime.base_price)
  }

  const calculateTotal = () => {
    if (!showtime || !showtime.base_price) return 0
    return calculateBookingTotal(selectedSeats, showtime.base_price)
  }

  const handleProceedToPayment = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }

    if (selectedSeats.length === 0) {
      alert('Vui lòng chọn ít nhất một ghế')
      return
    }

    try {
      const bookingData = {
        showtime_id: showtimeId,
        seat_ids: selectedSeats.map(seat => seat.id),
        total_amount: calculateTotal(),
        booking_type: 'ONLINE'
      }

      const response = await bookingService.createBooking(bookingData)
      if (response.code === 200) {
        navigate(`/booking/${response.data.id}/payment`)
      }
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.error === 'Seat already booked') {
        alert('Một hoặc nhiều ghế bạn chọn đã được đặt bởi người khác. Vui lòng chọn ghế khác.')
        setSelectedSeats([])
        fetchBookingData().then()
      } else if (err.response?.data?.error) {
        alert(err.response.data.error)
      } else {
        alert('Có lỗi xảy ra khi tạo booking')
      }
      console.error('Error creating booking:', err)
    }
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
      
      {/* Page Header */}
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
            <h1 className="text-xl font-semibold text-white">Đặt vé</h1>
            <div className="w-24"></div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Movie Info */}
          <div className="lg:col-span-2">
            {movie && (
              <div className="bg-gray-900 rounded-xl shadow-lg p-6 mb-6 border border-gray-800">
                <div className="flex gap-6">
                  <img
                    src={movie.poster_url}
                    alt={movie.title}
                    className="w-32 h-48 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-white mb-2">{movie.title}</h2>
                    <p className="text-gray-300 mb-4">{movie.description}</p>
                    <div className="space-y-2">
                      <p className="text-gray-300"><span className="font-medium text-white">Thể loại:</span> {movie.genre}</p>
                      <p className="text-gray-300"><span className="font-medium text-white">Thời lượng:</span> {movie.duration} phút</p>
                      <p className="text-gray-300"><span className="font-medium text-white">Đạo diễn:</span> {movie.director}</p>
                      <p className="text-gray-300"><span className="font-medium text-white">Diễn viên:</span> {movie.cast}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showtime && room && (
              <div className="bg-gray-900 rounded-xl shadow-lg p-6 mb-6 border border-gray-800">
                <h3 className="text-lg font-semibold text-white mb-4">Thông tin suất chiếu</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-400">Phòng chiếu</p>
                    <p className="font-medium text-white">Phòng {room.room_number} - {room.room_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Thời gian</p>
                    <p className="font-medium text-white">
                      {new Date(showtime.start_time).toLocaleDateString('vi-VN')} - 
                      {new Date(showtime.start_time).toLocaleTimeString('vi-VN', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Định dạng</p>
                    <p className="font-medium text-white uppercase">{showtime.format}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Giá cơ bản</p>
                    <p className="font-medium text-red-400">{formatPrice(showtime.base_price)}</p>
                  </div>
                </div>
                <div className="border-t border-gray-700 pt-4">
                  <p className="text-sm text-gray-400 mb-2">Bảng giá theo loại ghế:</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Ghế thường:</span>
                      <span className="text-white">{formatPrice(getPrice('REGULAR'))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Ghế VIP:</span>
                      <span className="text-white">{formatPrice(getPrice('VIP'))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Ghế đôi:</span>
                      <span className="text-white">{formatPrice(getPrice('COUPLE'))}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Seat Selection */}
            {step === 1 && (
              <div className="bg-gray-900 rounded-xl shadow-lg p-6 border border-gray-800">
                <h3 className="text-lg font-semibold text-white mb-4">Chọn ghế ngồi</h3>
                
                <SeatGrid
                  seats={seats}
                  selectedSeats={selectedSeats}
                  lockedSeats={lockedSeats}
                  bookedSeats={bookedSeats}
                  onSeatClick={handleSeatClick}
                  colorScheme="client"
                  interactive={true}
                  showScreen={true}
                  showEntrance={true}
                  showLegend={true}
                />
              </div>
            )}

            {/* Payment Step */}
            {step === 2 && (
              <div className="bg-gray-900 rounded-xl shadow-lg p-6 border border-gray-800">
                <h3 className="text-lg font-semibold text-white mb-4">Xác nhận thanh toán</h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-white mb-2">Ghế đã chọn:</h4>
                    <div className="space-y-2">
                      {selectedSeats.map((seat) => (
                        <div key={seat.id} className="flex justify-between items-center py-2 px-3 bg-gray-800 rounded-lg border border-gray-700">
                          <span className="font-medium text-white">
                            {seat.row_number}{seat.seat_number.toString().padStart(2, '0')} - {getSeatTypeLabel(seat.seat_type)}
                          </span>
                          <span className="text-red-400 font-medium">
                            {formatPrice(getPrice(seat.seat_type))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-gray-700 pt-4">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span className="text-white">Tổng cộng:</span>
                      <span className="text-red-400">{formatPrice(calculateTotal())}</span>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={() => setStep(1)}
                      className="flex-1 bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors duration-300"
                    >
                      Quay lại
                    </button>
                    <button
                      onClick={handleProceedToPayment}
                      className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors duration-300 flex items-center justify-center gap-2"
                    >
                      <FaCreditCard />
                      Thanh toán
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Booking Summary */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 rounded-xl shadow-lg p-6 sticky top-6 border border-gray-800">
              <h3 className="text-lg font-semibold text-white mb-4">Tóm tắt đặt vé</h3>
              
              {movie && (
                <div className="mb-4">
                  <img
                    src={movie.poster_url}
                    alt={movie.title}
                    className="w-full h-48 object-cover rounded-lg mb-3"
                  />
                  <h4 className="font-medium text-white">{movie.title}</h4>
                </div>
              )}

              {showtime && (
                <div className="space-y-2 text-sm text-gray-300 mb-4">
                  <p><span className="font-medium text-white">Phòng:</span> {room?.room_number}</p>
                  <p><span className="font-medium text-white">Thời gian:</span> {new Date(showtime.start_time).toLocaleString('vi-VN')}</p>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="font-medium text-white">Ghế đã chọn:</h4>
                {selectedSeats.length === 0 ? (
                  <p className="text-gray-400 text-sm">Chưa chọn ghế nào</p>
                ) : (
                  <div className="space-y-1">
                    {selectedSeats.map((seat) => (
                      <div key={seat.id} className="flex justify-between text-sm">
                        <span className="text-gray-300">{seat.row_number}{seat.seat_number.toString().padStart(2, '0')}</span>
                        <span className="text-red-400">{formatPrice(getPrice(seat.seat_type))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedSeats.length > 0 && (
                <div className="border-t border-gray-700 pt-4 mt-4">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-white">Tổng cộng:</span>
                    <span className="text-red-400">{formatPrice(calculateTotal())}</span>
                  </div>
                </div>
              )}

              {step === 1 && selectedSeats.length > 0 && (
                <button
                  onClick={handleProceedToPayment}
                  className="w-full mt-4 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors duration-300 flex items-center justify-center gap-2"
                >
                  <FaShoppingCart />
                  Tiếp tục thanh toán
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BookingPage
