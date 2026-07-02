import { useEffect, useState } from 'react'
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaClock,
  FaDoorOpen,
  FaExclamationTriangle,
  FaFilm,
  FaMoneyBillWave,
  FaSave,
  FaTags,
} from 'react-icons/fa'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import { movieService } from '../../services/movieApi'
import { roomService } from '../../services/roomApi'
import { showtimeService } from '../../services/showtimeApi'
import { toLocalDatetimeString } from '../../utils/dateUtils'

const ShowtimeFormPage = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const isEditing = Boolean(id)

  const [formData, setFormData] = useState({
    movie_id: '',
    room_id: '',
    start_time: '',
    end_time: '',
    format: '2D',
    base_price: '',
    status: 'SCHEDULED',
  })
  const [rooms, setRooms] = useState([])
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [conflictWarning, setConflictWarning] = useState('')
  const [timeInfo, setTimeInfo] = useState('')
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [selectedRoom, setSelectedRoom] = useState(null)

  const showtimeFormats = showtimeService.getShowtimeFormats()
  const showtimeStatuses = showtimeService.getShowtimeStatuses()

  useEffect(() => {
    fetchRooms().then()
    fetchMovies().then()
    if (isEditing) {
      fetchShowtime().then()
    } else {
      const roomId = searchParams.get('roomId')
      const startTime = searchParams.get('startTime')

      if (roomId || startTime) {
        setFormData(prev => ({
          ...prev,
          ...(roomId && { room_id: roomId }),
          ...(startTime && { start_time: startTime })
        }))
      }
    }
  }, [id, isEditing])

  useEffect(() => {
    if (formData.start_time) {
      checkTimeInfo()
    }
  }, [formData.start_time, formData.end_time, selectedMovie])

  useEffect(() => {
    if (formData.movie_id) {
      const movie = movies.find((m) => m.id === formData.movie_id)
      setSelectedMovie(movie)
    }
  }, [formData.movie_id, movies])

  useEffect(() => {
    if (formData.room_id) {
      const room = rooms.find((r) => r.id === formData.room_id)
      setSelectedRoom(room)
    }
  }, [formData.room_id, rooms])

  useEffect(() => {
    if (formData.start_time && selectedMovie?.duration) {
      const duration = selectedMovie.duration
      const [datePart, timePart] = formData.start_time.split('T')
      const [hours, minutes] = timePart.split(':').map(Number)

      const totalMinutes = hours * 60 + minutes + duration
      const endHours = Math.floor(totalMinutes / 60) % 24
      const endMinutes = totalMinutes % 60

      const endTime = `${datePart}T${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`

      setFormData((prev) => ({ ...prev, end_time: endTime }))
    }
  }, [formData.start_time, selectedMovie?.duration])

  const fetchRooms = async () => {
    try {
      const response = await roomService.getRooms(1, 100, '', '', 'ACTIVE')
      if (response.success) {
        setRooms(response.data.data || [])
      }
    } catch (err) {
      console.error('Error fetching rooms:', err)
    }
  }

  const fetchMovies = async () => {
    try {
      const response = await movieService.getMovies(1, 100, '', 'SHOWING')
      if (response.success) {
        setMovies(response.data.movies || [])
      }
    } catch (err) {
      console.error('Error fetching movies:', err)
    }
  }

  const fetchShowtime = async () => {
    try {
      setLoading(true)
      const response = await showtimeService.getShowtimeById(id)

      if (response.success) {
        const showtime = response.data
        setFormData({
          movie_id: showtime.movie_id,
          room_id: showtime.room_id,
          start_time: toLocalDatetimeString(showtime.start_time),
          end_time: toLocalDatetimeString(showtime.end_time),
          format: showtime.format,
          base_price: showtime.base_price.toString(),
          status: showtime.status,
        })
      } else {
        setError('Không thể tải thông tin lịch chiếu')
      }
    } catch (err) {
      setError('Có lỗi xảy ra khi tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }

  const checkTimeInfo = () => {
    if (!formData.start_time) return

    const startTime = new Date(formData.start_time)

    let info = ''

    if (formData.end_time) {
      const endTime = new Date(formData.end_time)
      const scheduledDuration = (endTime.getTime() - startTime.getTime()) / (1000 * 60)

      info += `Thời lượng lịch chiếu: ${Math.floor(scheduledDuration / 60)}h ${scheduledDuration % 60}m`

      if (selectedMovie && selectedMovie.duration) {
        const movieDuration = selectedMovie.duration
        info += '\n'
        info += `Thời lượng phim: ${Math.floor(movieDuration / 60)}h ${movieDuration % 60}m`

        if (scheduledDuration < movieDuration) {
          info += '\n'
          info += `⚠️ CẢNH BÁO: Thời lượng lịch chiếu (${Math.floor(scheduledDuration / 60)}h ${scheduledDuration % 60}m) ngắn hơn thời lượng phim (${Math.floor(movieDuration / 60)}h ${movieDuration % 60}m)`
        } else if (scheduledDuration > movieDuration + 30) {
          const bufferTime = scheduledDuration - movieDuration
          info += '\n'
          info += `✅ Thời gian dự phòng: ${Math.floor(bufferTime / 60)}h ${bufferTime % 60}m (bao gồm dọn dẹp, quảng cáo)`
        }
      }
    }

    setTimeInfo(info)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (
      !formData.movie_id ||
      !formData.room_id ||
      !formData.start_time ||
      !formData.end_time ||
      !formData.base_price
    ) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc')
      return
    }

    const basePrice = parseFloat(formData.base_price)
    if (basePrice <= 0) {
      setError('Giá vé phải lớn hơn 0')
      return
    }

    const startTime = new Date(formData.start_time)
    const endTime = new Date(formData.end_time)

    if (endTime <= startTime) {
      setError('Thời gian kết thúc phải sau thời gian bắt đầu')
      return
    }

    if (startTime < new Date()) {
      setError('Không thể tạo lịch chiếu trong quá khứ')
      return
    }

    if (selectedMovie && selectedMovie.duration) {
      const scheduledDuration = (endTime.getTime() - startTime.getTime()) / (1000 * 60)

      if (scheduledDuration < selectedMovie.duration) {
        setError(
          `Thời lượng lịch chiếu (${Math.floor(scheduledDuration / 60)}h ${scheduledDuration % 60}m) phải lớn hơn hoặc bằng thời lượng phim (${Math.floor(selectedMovie.duration / 60)}h ${selectedMovie.duration % 60}m)`,
        )
        return
      }
    }

    try {
      setLoading(true)
      setError('')

      const requestData = {
        movie_id: formData.movie_id,
        room_id: formData.room_id,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
        format: formData.format,
        base_price: basePrice,
      }

      if (isEditing) {
        requestData.status = formData.status
        await showtimeService.updateShowtime(id, requestData)
      } else {
        await showtimeService.createShowtime(requestData)
      }

      const fromTimeline = searchParams.get('roomId') && searchParams.get('startTime')
      if (fromTimeline) {
        const createdDate = new Date(formData.start_time).toISOString().split('T')[0]
        navigate(`/admin/showtimes?view=timeline&date=${createdDate}`)
      } else {
        navigate('/admin/showtimes')
      }
    } catch (err) {
      if (err.response?.data?.message?.includes('conflicts')) {
        setError('Lịch chiếu bị trùng với lịch chiếu khác trong phòng')
      } else if (err.response?.data?.message?.includes('past')) {
        setError('Không thể tạo lịch chiếu trong quá khứ')
      } else {
        setError(
          isEditing ? 'Có lỗi xảy ra khi cập nhật lịch chiếu' : 'Có lỗi xảy ra khi tạo lịch chiếu',
        )
      }
      console.error('Error saving showtime:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleMovieChange = (e) => {
    const movieId = e.target.value
    setFormData((prev) => ({ ...prev, movie_id: movieId }))
  }

  const handleRoomChange = (e) => {
    const roomId = e.target.value
    const room = rooms.find((r) => r.id === roomId)

    if (room && room.room_type === 'IMAX') {
      setFormData((prev) => ({ ...prev, room_id: roomId, format: 'IMAX' }))
    } else {
      setFormData((prev) => ({ ...prev, room_id: roomId }))
    }
  }

  const getRoomTypeLabel = (roomType) => {
    switch (roomType) {
      case 'STANDARD':
        return 'Standard'
      case 'VIP':
        return 'VIP'
      case 'IMAX':
        return 'IMAX'
      default:
        return roomType
    }
  }

  const getAvailableFormats = () => {
    if (!selectedRoom) return showtimeFormats

    if (selectedRoom.room_type === 'IMAX') {
      return showtimeFormats.filter(f => f.value === 'IMAX')
    }

    return showtimeFormats.filter(f => f.value === '2D' || f.value === '3D')
  }

  if (loading && isEditing) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/showtimes')}
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-all duration-200"
            >
              <FaArrowLeft size={18} />
            </button>
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                  <FaClock className="text-white text-sm" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {isEditing ? 'Chỉnh sửa lịch chiếu' : 'Tạo lịch chiếu mới'}
                </h1>
              </div>
              <p className="text-gray-600">
                {isEditing
                  ? 'Cập nhật thông tin lịch chiếu của phim'
                  : 'Tạo lịch chiếu mới cho hệ thống rạp'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <form onSubmit={handleSubmit} className="p-6 lg:p-8 space-y-6">
            {/* Alert Messages */}
            <div className="space-y-4">
              {error && (
                <div className="bg-gradient-to-r from-red-50 to-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-sm">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <FaExclamationTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Lỗi xác thực</h3>
                      <div className="mt-1 text-sm text-red-700">{error}</div>
                    </div>
                  </div>
                </div>
              )}

              {conflictWarning && (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-500 p-4 rounded-lg shadow-sm">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <FaExclamationTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">Cảnh báo xung đột</h3>
                      <div className="mt-1 text-sm text-yellow-700">{conflictWarning}</div>
                    </div>
                  </div>
                </div>
              )}

              {timeInfo && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-4 rounded-lg shadow-sm">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <FaClock className="h-5 w-5 text-blue-600 mt-0.5" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">Thông tin thời gian</h3>
                      <div className="mt-1 text-sm text-blue-700 whitespace-pre-line">
                        {timeInfo}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Form Fields */}
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Movie */}
                <div className="space-y-2">
                  <label
                    htmlFor="movie_id"
                    className="flex items-center text-sm font-semibold text-gray-900"
                  >
                    <FaFilm className="mr-2 text-red-500" size={16} />
                    Chọn phim <span className="text-red-500 ml-1">*</span>
                  </label>
                  <select
                    id="movie_id"
                    name="movie_id"
                    value={formData.movie_id}
                    onChange={handleMovieChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                  >
                    <option value="">-- Chọn phim để chiếu --</option>
                    {movies.map((movie) => (
                      <option key={movie.id} value={movie.id}>
                        {movie.title}{' '}
                        {movie.duration
                          ? `(${Math.floor(movie.duration / 60)}h ${movie.duration % 60}m)`
                          : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Room */}
                <div className="space-y-2">
                  <label
                    htmlFor="room_id"
                    className="flex items-center text-sm font-semibold text-gray-900"
                  >
                    <FaDoorOpen className="mr-2 text-red-500" size={16} />
                    Phòng chiếu <span className="text-red-500 ml-1">*</span>
                  </label>
                  <select
                    id="room_id"
                    name="room_id"
                    value={formData.room_id}
                    onChange={handleRoomChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                  >
                    <option value="">-- Chọn phòng chiếu --</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        Phòng {room.room_number} - {getRoomTypeLabel(room.room_type)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Start Time */}
                <div className="space-y-2">
                  <label
                    htmlFor="start_time"
                    className="flex items-center text-sm font-semibold text-gray-900"
                  >
                    <FaCalendarAlt className="mr-2 text-red-500" size={16} />
                    Thời gian bắt đầu <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    id="start_time"
                    name="start_time"
                    value={formData.start_time}
                    onChange={handleChange}
                    required
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                  />
                </div>

                {/* End Time */}
                <div className="space-y-2">
                  <label
                    htmlFor="end_time"
                    className="flex items-center text-sm font-semibold text-gray-900"
                  >
                    <FaClock className="mr-2 text-red-500" size={16} />
                    Thời gian kết thúc <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    id="end_time"
                    name="end_time"
                    value={formData.end_time}
                    onChange={handleChange}
                    required
                    min={formData.start_time}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Format */}
                <div className="space-y-2">
                  <label
                    htmlFor="format"
                    className="flex items-center text-sm font-semibold text-gray-900"
                  >
                    <FaTags className="mr-2 text-red-500" size={16} />
                    Định dạng chiếu <span className="text-red-500 ml-1">*</span>
                  </label>
                  <select
                    id="format"
                    name="format"
                    value={formData.format}
                    onChange={handleChange}
                    required
                    disabled={selectedRoom?.room_type === 'IMAX'}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    {getAvailableFormats().map((format) => (
                      <option key={format.value} value={format.value}>
                        {format.label}
                      </option>
                    ))}
                  </select>
                  {selectedRoom?.room_type === 'IMAX' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Phòng IMAX chỉ chiếu định dạng IMAX
                    </p>
                  )}
                </div>

                {/* Base Price */}
                <div className="space-y-2">
                  <label
                    htmlFor="base_price"
                    className="flex items-center text-sm font-semibold text-gray-900"
                  >
                    <FaMoneyBillWave className="mr-2 text-red-500" size={16} />
                    Giá vé cơ bản (VNĐ) <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="number"
                    id="base_price"
                    name="base_price"
                    value={formData.base_price}
                    onChange={handleChange}
                    min="0"
                    step="1000"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                    placeholder="Ví dụ: 80000"
                  />
                </div>
              </div>

              {/* Status (only for editing) */}
              {isEditing && (
                <div className="space-y-2">
                  <label
                    htmlFor="status"
                    className="flex items-center text-sm font-semibold text-gray-900"
                  >
                    <FaExclamationTriangle className="mr-2 text-red-500" size={16} />
                    Trạng thái lịch chiếu
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                  >
                    {showtimeStatuses.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-8 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/admin/showtimes')}
                className="px-6 py-3 text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
              >
                Hủy thao tác
              </button>
              <button
                type="submit"
                disabled={loading || !!conflictWarning}
                className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <FaSave size={18} />
                )}
                {isEditing ? 'Cập nhật lịch chiếu' : 'Tạo lịch chiếu mới'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  )
}

export default ShowtimeFormPage
