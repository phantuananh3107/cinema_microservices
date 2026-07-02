import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaArrowRight, FaCheck, FaFilm, FaCouch, FaCheckCircle } from 'react-icons/fa'
import AdminLayout from '../../components/admin/AdminLayout'
import SeatGrid from '../../components/SeatGrid'
import { movieService } from '../../services/movieService'
import { showtimeService } from '../../services/showtimeApi'
import boxOfficeService from '../../services/boxOfficeService'
import { getSeatPrice, calculateBookingTotal, getSeatTypeLabel } from '../../constants/seatConstants'
import { formatCurrency, formatDateTime } from '../../utils/formatters'
import { useLockedSeats } from '../../hooks/useLockedSeats'

const BoxOfficePage = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [movies, setMovies] = useState([])
  const [showtimes, setShowtimes] = useState([])
  const [selectedShowtime, setSelectedShowtime] = useState(null)
  const [room, setRoom] = useState(null)
  const [seats, setSeats] = useState([])
  const [selectedSeats, setSelectedSeats] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [bookingResult, setBookingResult] = useState(null)

  const { lockedSeats, bookedSeats } = useLockedSeats(
    selectedShowtime?.id,
    seats,
    selectedSeats,
    setSelectedSeats,
    step === 2
  )

  useEffect(() => {
    if (step === 1) {
      fetchMovies().then()
      fetchScheduledShowtimes().then()
    }
  }, [step])

  const fetchMovies = async () => {
    try {
      const response = await movieService.getShowingMovies()
      if (response.success && response.data) {
        const moviesData = Array.isArray(response.data.movies) ? response.data.movies :
                          Array.isArray(response.data) ? response.data :
                          Array.isArray(response.data.data) ? response.data.data : []
        setMovies(moviesData)
      }
    } catch (err) {
      console.error('Error fetching movies:', err)
    }
  }

  const fetchScheduledShowtimes = async () => {
    try {
      setLoading(true)
      setError('')

      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const dateFrom = today.toISOString().split('T')[0]
      const dateTo = tomorrow.toISOString().split('T')[0]

      const response = await showtimeService.getShowtimes(
        1,
        12,
        '',
        '',
        '',
        '',
        'SCHEDULED',
        dateFrom,
        dateTo,
        true
      )

      if (!response.success) {
        setError('Không thể hiển thị danh sách suất chiếu.')
        setShowtimes([])
        return
      }

      if (!response.data) {
        setShowtimes([])
        return
      }

      const showtimesData = Array.isArray(response.data) ? response.data :
                           Array.isArray(response.data.data) ? response.data.data : []

      setShowtimes(showtimesData)
    } catch (err) {
      setError('Không thể hiển thị danh sách suất chiếu.')
      setShowtimes([])
      console.error('Error fetching showtimes:', err)
    } finally {
      setLoading(false)
    }
  }

  const getMoviePoster = (movieId) => {
    const movie = movies.find(m => m.id === movieId)
    return movie?.poster_url || ''
  }

  const getMovieTitle = (movieId) => {
    const movie = movies.find(m => m.id === movieId)
    return movie?.title || ''
  }

  const handleShowtimeSelect = async (showtime) => {
    try {
      setLoading(true)
      setError('')

      const response = await showtimeService.getShowtimeById(showtime.id)

      if (!response.success || !response.data) {
        setError('Không thể tải thông tin suất chiếu.')
        setLoading(false)
        return
      }

      const showtimeData = response.data
      setSelectedShowtime(showtimeData)
      setRoom(showtimeData.room)
      setSeats(showtimeData.seats || [])
      setSelectedSeats([])
      setStep(2)
    } catch (err) {
      setError('Có lỗi xảy ra khi tải dữ liệu')
      console.error('Error fetching showtime:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSeatSelect = (seat) => {
    if (!seat || seat.status === 'OCCUPIED' || seat.status === 'MAINTENANCE' || seat.status === 'BLOCKED') {
      return
    }

    const isLocked = lockedSeats && lockedSeats.some(lockedSeat => lockedSeat.id === seat.id)
    if (isLocked) {
      return
    }

    const isBooked = bookedSeats && bookedSeats.some(bookedSeat => bookedSeat.id === seat.id)
    if (isBooked) {
      return
    }

    const isSelected = selectedSeats.some(s => s.id === seat.id)
    if (isSelected) {
      setSelectedSeats(selectedSeats.filter(s => s.id !== seat.id))
    } else {
      setSelectedSeats([...selectedSeats, seat])
    }
  }

  const handleConfirmBooking = async () => {
    if (selectedSeats.length === 0) {
      setError('Vui lòng chọn ít nhất một ghế')
      return
    }

    try {
      setLoading(true)
      setError('')

      const bookingData = {
        showtime_id: selectedShowtime.id,
        seat_ids: selectedSeats.map(s => s.id)
      }

      const response = await boxOfficeService.createBoxOfficeBooking(bookingData)

      if (response.code === 200) {
        navigate(`/admin/box-office/payment/${response.data.id}`)
      } else {
        setError('Bán vé không thành công.')
      }
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.error === 'Seat already booked') {
        setError('Một hoặc nhiều ghế đã được đặt bởi người khác. Vui lòng chọn ghế khác.')
        setSelectedSeats([])
        const response = await showtimeService.getShowtimeById(selectedShowtime.id)
        if (response.success && response.data) {
          setSeats(response.data.seats || [])
        }
      } else if (err.response?.data?.error) {
        setError(err.response.data.error)
      } else {
        setError('Bán vé không thành công.')
      }
      console.error('Error creating booking:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleNewBooking = () => {
    setStep(1)
    setSelectedShowtime(null)
    setRoom(null)
    setSeats([])
    setSelectedSeats([])
    setError('')
    setSuccess(false)
    setBookingResult(null)
  }


  const calculateTotal = () => {
    if (!selectedShowtime || selectedSeats.length === 0) return 0
    const basePrice = selectedShowtime.base_price || 0
    return calculateBookingTotal(selectedSeats, basePrice)
  }

  if (success && step === 3) {
    return (
      <AdminLayout>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-10 text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-full p-8 shadow-lg">
                <FaCheckCircle className="text-7xl text-white" />
              </div>
            </div>

            <h2 className="text-4xl font-bold text-gray-900 mb-3">Bán vé thành công!</h2>
            <p className="text-gray-600 text-lg mb-10">Vé đã được tạo và lưu vào hệ thống</p>

            {bookingResult && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-8 mb-10 text-left border-2 border-blue-100">
                <h3 className="text-xl font-bold mb-6 text-blue-900 flex items-center gap-2">
                  <FaFilm className="text-blue-600" />
                  Thông tin đặt vé
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-700 min-w-[120px]">Mã đặt vé:</span>
                    <span className="font-mono font-bold text-blue-700 bg-white px-3 py-1 rounded">{bookingResult.id}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-700 min-w-[120px]">Phim:</span>
                    <span className="font-bold text-gray-900">{selectedShowtime?.movie?.title || getMovieTitle(selectedShowtime?.movie_id)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-700 min-w-[120px]">Suất chiếu:</span>
                    <span className="text-gray-900">{formatDateTime(selectedShowtime?.start_time)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-700 min-w-[120px]">Phòng:</span>
                    <span className="text-gray-900">{room?.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-700 min-w-[120px]">Ghế:</span>
                    <span className="font-bold text-gray-900">{selectedSeats.map(s => `${s.row_number}${s.seat_number}`).join(', ')}</span>
                  </div>
                  <div className="flex items-center gap-3 pt-3 border-t-2 border-blue-200">
                    <span className="font-bold text-gray-900 min-w-[120px]">Tổng tiền:</span>
                    <span className="text-2xl font-bold text-green-600">{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleNewBooking}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-10 py-4 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 inline-flex items-center gap-3 text-lg font-semibold"
            >
              <FaCheck />
              Bán vé mới
            </button>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div className="text-white">
              <h1 className="text-3xl font-bold mb-2">Bán vé tại quầy</h1>
              <p className="text-blue-100">Chọn phim, suất chiếu và ghế cho khách hàng</p>
            </div>

            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-5 py-3 rounded-lg transition-all ${step >= 1 ? 'bg-white text-blue-700 shadow-md' : 'bg-blue-500 text-blue-200'}`}>
                <FaFilm className="text-lg" />
                <span className="font-semibold">Chọn suất chiếu</span>
              </div>
              <FaArrowRight className={step >= 2 ? 'text-white' : 'text-blue-400'} />
              <div className={`flex items-center gap-2 px-5 py-3 rounded-lg transition-all ${step >= 2 ? 'bg-white text-blue-700 shadow-md' : 'bg-blue-500 text-blue-200'}`}>
                <FaCouch className="text-lg" />
                <span className="font-semibold">Chọn ghế</span>
              </div>
              <FaArrowRight className={step >= 3 ? 'text-white' : 'text-blue-400'} />
              <div className={`flex items-center gap-2 px-5 py-3 rounded-lg transition-all ${step >= 3 ? 'bg-white text-blue-700 shadow-md' : 'bg-blue-500 text-blue-200'}`}>
                <FaCheck className="text-lg" />
                <span className="font-semibold">Hoàn tất</span>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
                <FaFilm className="text-blue-600" />
                Danh sách suất chiếu sắp tới
              </h2>
              
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : showtimes.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  Không có suất chiếu sắp tới
                </div>
              ) : (
                <div className="grid gap-4">
                  {showtimes.map((showtime) => {
                    const movie = showtime.movie || movies.find(m => m.id === showtime.movie_id)
                    const moviePoster = movie?.poster_url || ''
                    const movieTitle = movie?.title || ''
                    const movieDuration = movie?.duration
                    const movieUrl = movie?.trailer_url || movie?.url || ''

                    return (
                      <div
                        key={showtime.id}
                        onClick={() => handleShowtimeSelect(showtime)}
                        className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-blue-500 hover:shadow-xl cursor-pointer transition-all duration-200 transform hover:-translate-y-1"
                      >
                        <div className="flex gap-5">
                          {moviePoster ? (
                            <img
                              src={moviePoster}
                              alt={movieTitle || 'Movie poster'}
                              className="w-28 h-40 object-cover rounded-lg flex-shrink-0 shadow-md"
                              onError={(e) => {
                                e.target.style.display = 'none'
                              }}
                            />
                          ) : (
                            <div className="w-28 h-40 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex-shrink-0 flex items-center justify-center shadow-md">
                              <FaFilm className="text-gray-400 text-4xl" />
                            </div>
                          )}
                          <div className="flex-1 flex flex-col justify-between">
                            <div>
                              <h3 className="font-bold text-xl mb-3 text-gray-900 line-clamp-2">
                                {movieTitle || 'Đang cập nhật'}
                              </h3>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-gray-700">
                                  <span className="font-semibold text-blue-600 min-w-[90px]">Giờ chiếu:</span>
                                  <span className="font-medium">{formatDateTime(showtime.start_time)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-700">
                                  <span className="font-semibold text-blue-600 min-w-[90px]">Phòng:</span>
                                  <span className="font-medium">{showtime.room?.name}</span>
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                                    {showtime.format?.toUpperCase()}
                                  </span>
                                </div>
                                {movieDuration && (
                                  <div className="flex items-center gap-2 text-sm text-gray-700">
                                    <span className="font-semibold text-blue-600 min-w-[90px]">Thời lượng:</span>
                                    <span className="font-medium">{movieDuration} phút</span>
                                  </div>
                                )}
                                {movieUrl && (
                                  <div className="flex items-start gap-2 text-sm text-gray-700">
                                    <span className="font-semibold text-blue-600 min-w-[90px]">Trailer:</span>
                                    <a
                                      href={movieUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-blue-600 hover:text-blue-800 hover:underline truncate flex-1 font-medium"
                                      title={movieUrl}
                                    >
                                      {movieUrl}
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 2 && selectedShowtime && (
          <div className="space-y-6">
            <button
              onClick={() => {
                setStep(1)
                setSelectedSeats([])
                setSeats([])
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
            >
              <FaArrowLeft />
              Quay lại chọn suất chiếu
            </button>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="mb-6 pb-6 border-b">
                <h2 className="text-2xl font-bold mb-4 text-gray-900 flex items-center gap-2">
                  <FaCouch className="text-blue-600" />
                  Chọn ghế
                </h2>
                <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-blue-700 min-w-[100px]">Phim:</span>
                    <span className="text-sm font-bold text-gray-900">{selectedShowtime?.movie?.title || getMovieTitle(selectedShowtime?.movie_id)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-blue-700 min-w-[100px]">Suất chiếu:</span>
                    <span className="text-sm font-medium text-gray-900">{formatDateTime(selectedShowtime.start_time)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-blue-700 min-w-[100px]">Phòng:</span>
                    <span className="text-sm font-medium text-gray-900">{room?.name}</span>
                  </div>
                </div>
              </div>

              <SeatGrid
                seats={seats}
                selectedSeats={selectedSeats}
                lockedSeats={lockedSeats}
                bookedSeats={bookedSeats}
                onSeatClick={handleSeatSelect}
                colorScheme="client"
                interactive={true}
                showScreen={true}
                showEntrance={true}
                showLegend={true}
              />

              {selectedSeats.length > 0 && (
                <div className="border-t pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Ghế đã chọn:</p>
                      <p className="font-semibold">
                        {selectedSeats.map(s => `${s.row_number}${s.seat_number}`).join(', ')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Tổng tiền:</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(calculateTotal())}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleConfirmBooking}
                    disabled={loading || selectedSeats.length === 0}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Đang xử lý...</span>
                      </>
                    ) : (
                      <>
                        <FaCheck />
                        <span>Xác nhận bán vé</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default BoxOfficePage

