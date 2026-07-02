import { useState, useEffect } from 'react'
import { FaPlus, FaEdit, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import { formatTime, formatShowtimeTime, getDurationInMinutes } from '../../utils/dateUtils'

const COLORS = [
  { bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-white' },
  { bg: 'bg-purple-500', border: 'border-purple-600', text: 'text-white' },
  { bg: 'bg-pink-500', border: 'border-pink-600', text: 'text-white' },
  { bg: 'bg-red-500', border: 'border-red-600', text: 'text-white' },
  { bg: 'bg-orange-500', border: 'border-orange-600', text: 'text-white' },
  { bg: 'bg-yellow-500', border: 'border-yellow-600', text: 'text-gray-900' },
  { bg: 'bg-green-500', border: 'border-green-600', text: 'text-white' },
  { bg: 'bg-teal-500', border: 'border-teal-600', text: 'text-white' },
  { bg: 'bg-cyan-500', border: 'border-cyan-600', text: 'text-white' },
  { bg: 'bg-indigo-500', border: 'border-indigo-600', text: 'text-white' },
]

const ShowtimeTimelineView = ({ showtimes, rooms, selectedDate, onCreateShowtime, onDateChange }) => {
  const navigate = useNavigate()
  const [timelineData, setTimelineData] = useState({})
  const [hoveredSlot, setHoveredSlot] = useState(null)
  const [totalShowtimes, setTotalShowtimes] = useState(0)
  const [movieColorMap, setMovieColorMap] = useState({})

  const START_HOUR = 6
  const END_HOUR = 24
  const TOTAL_HOURS = END_HOUR - START_HOUR
  const SLOT_WIDTH = 60

  useEffect(() => {
    if (!showtimes || showtimes.length === 0) {
      setTimelineData({})
      setTotalShowtimes(0)
      setMovieColorMap({})
      return
    }

    const data = {}
    const filterDate = selectedDate ? new Date(selectedDate) : new Date()
    const targetDateStr = filterDate.toISOString().split('T')[0]
    let count = 0
    const uniqueMovies = new Set()

    showtimes.forEach(showtime => {
      const showtimeDate = new Date(showtime.start_time).toISOString().split('T')[0]
      if (showtimeDate !== targetDateStr) return

      const roomId = showtime.room_id || showtime.room?.id
      if (!data[roomId]) {
        data[roomId] = []
      }
      data[roomId].push(showtime)
      count++

      const movieId = showtime.movie_id || showtime.movie?.id
      if (movieId) {
        uniqueMovies.add(movieId)
      }
    })

    const colorMap = {}
    Array.from(uniqueMovies).forEach((movieId, index) => {
      colorMap[movieId] = COLORS[index % COLORS.length]
    })

    setTimelineData(data)
    setTotalShowtimes(count)
    setMovieColorMap(colorMap)
  }, [showtimes, selectedDate])

  const getMovieColor = (movieId) => {
    return movieColorMap[movieId] || COLORS[0]
  }

  const timeToPosition = (timeStr) => {
    const date = new Date(timeStr)
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const totalMinutes = (hours - START_HOUR) * 60 + minutes
    const totalTimelineMinutes = TOTAL_HOURS * 60
    return (totalMinutes / totalTimelineMinutes) * 100
  }

  const durationToWidth = (duration) => {
    const totalTimelineMinutes = TOTAL_HOURS * 60
    return (duration / totalTimelineMinutes) * 100
  }

  const checkConflict = (roomId, startTime, endTime, excludeId = null) => {
    const roomShowtimes = timelineData[roomId] || []
    const start = new Date(startTime)
    const end = new Date(endTime)

    return roomShowtimes.some(showtime => {
      if (excludeId && showtime.id === excludeId) return false

      const showtimeStart = new Date(showtime.start_time)
      const showtimeEnd = new Date(showtime.end_time)

      return (start < showtimeEnd && end > showtimeStart)
    })
  }

  const handleSlotClick = (roomId, hour, minute = 0) => {
    if (!onCreateShowtime) return

    const filterDate = selectedDate ? new Date(selectedDate) : new Date()
    const clickedTime = new Date(filterDate)
    clickedTime.setHours(hour, minute, 0, 0)

    onCreateShowtime(roomId, clickedTime)
  }

  const handleShowtimeClick = (showtimeId) => {
    navigate(`/admin/showtimes/${showtimeId}/edit`)
  }

  const navigateDate = (days) => {
    if (!onDateChange) return
    const currentDate = new Date(selectedDate)
    currentDate.setDate(currentDate.getDate() + days)
    const newDateStr = currentDate.toISOString().split('T')[0]
    onDateChange(newDateStr)
  }

  const goToToday = () => {
    if (!onDateChange) return
    const today = new Date().toISOString().split('T')[0]
    onDateChange(today)
  }

  if (!rooms || rooms.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🎬</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Chưa có phòng chiếu</h3>
        <p className="text-gray-500">Vui lòng thêm phòng chiếu để xem timeline</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Timeline lịch chiếu theo phòng</h3>
            <p className="text-sm text-gray-500 mt-1">
              {totalShowtimes > 0
                ? `${totalShowtimes} suất chiếu - Click vào khung giờ trống để tạo mới`
                : 'Chưa có suất chiếu - Click vào khung giờ để tạo mới'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigateDate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Ngày trước"
            >
              <FaChevronLeft className="text-gray-600" />
            </button>
            <div className="text-center">
              <div className="text-sm font-semibold text-gray-900">
                {selectedDate ? new Date(selectedDate).toLocaleDateString('vi-VN', {
                  weekday: 'short',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                }) : new Date().toLocaleDateString('vi-VN')}
              </div>
              <button
                onClick={goToToday}
                className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
              >
                Hôm nay
              </button>
            </div>
            <button
              onClick={() => navigateDate(1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Ngày sau"
            >
              <FaChevronRight className="text-gray-600" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div style={{ minWidth: `${TOTAL_HOURS * SLOT_WIDTH + 150}px` }}>
            <div className="flex border-b border-gray-200 pb-2 mb-4">
              <div className="w-32 flex-shrink-0 font-semibold text-gray-700">Phòng</div>
              <div className="flex-1 flex">
                {Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i).map(hour => (
                  <div
                    key={hour}
                    className="flex-1 text-center text-xs font-medium text-gray-600"
                    style={{ minWidth: `${SLOT_WIDTH}px` }}
                  >
                    {formatTime(hour)}
                  </div>
                ))}
              </div>
            </div>

            {rooms.map(room => {
              const roomShowtimes = timelineData[room.id] || []

              return (
                <div key={room.id} className="flex mb-4 group">
                  <div className="w-32 flex-shrink-0 pr-4">
                    <div className="font-semibold text-gray-900">Phòng {room.room_number}</div>
                    <div className="text-xs text-gray-500">{room.name || ''}</div>
                  </div>

                  <div className="flex-1 relative" style={{ height: '80px' }}>
                    <div className="absolute inset-0 border border-gray-200 rounded-lg bg-gray-50">
                      {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                        <div
                          key={i}
                          className="absolute top-0 bottom-0 border-r border-gray-200 hover:bg-blue-50 cursor-pointer transition-colors"
                          style={{
                            left: `${(i / TOTAL_HOURS) * 100}%`,
                            width: `${(1 / TOTAL_HOURS) * 100}%`
                          }}
                          onClick={() => handleSlotClick(room.id, START_HOUR + i)}
                          onMouseEnter={() => setHoveredSlot({ roomId: room.id, hour: START_HOUR + i })}
                          onMouseLeave={() => setHoveredSlot(null)}
                        >
                          {hoveredSlot?.roomId === room.id && hoveredSlot?.hour === START_HOUR + i && (
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <FaPlus className="text-blue-500 text-xl" />
                            </div>
                          )}
                        </div>
                      ))}

                      {roomShowtimes.map(showtime => {
                        const leftPos = timeToPosition(showtime.start_time)
                        const actualDuration = getDurationInMinutes(showtime.start_time, showtime.end_time)
                        const width = durationToWidth(actualDuration)
                        const color = getMovieColor(showtime.movie?.id || showtime.movie_id)
                        const hasConflict = checkConflict(room.id, showtime.start_time, showtime.end_time, showtime.id)

                        return (
                          <div
                            key={showtime.id}
                            className={`absolute top-1 bottom-1 ${color.bg} ${color.border} border-2 rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer overflow-hidden group/showtime ${hasConflict ? 'ring-2 ring-red-500' : ''}`}
                            style={{
                              left: `${leftPos}%`,
                              width: `${width}%`,
                              zIndex: 10
                            }}
                            onClick={() => handleShowtimeClick(showtime.id)}
                          >
                            <div className="h-full p-2 flex flex-col justify-between">
                              <div className={`text-xs font-bold ${color.text} truncate`}>
                                {showtime.movie?.title || 'N/A'}
                              </div>
                              <div className={`text-xs ${color.text} flex items-center justify-between`}>
                                <span>{formatShowtimeTime(showtime.start_time)}</span>
                                <span className="opacity-0 group-hover/showtime:opacity-100 transition-opacity">
                                  <FaEdit />
                                </span>
                              </div>
                            </div>

                            <div className="absolute inset-0 bg-black opacity-0 group-hover/showtime:opacity-10 transition-opacity pointer-events-none"></div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="text-sm font-semibold text-gray-700">Chú thích:</div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-xs text-gray-600">Mỗi màu đại diện cho một phim khác nhau</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-red-500 rounded"></div>
              <span className="text-xs text-gray-600">Viền đỏ: Có conflict (trùng giờ)</span>
            </div>
            <div className="flex items-center gap-2">
              <FaPlus className="text-blue-500" />
              <span className="text-xs text-gray-600">Click vào ô trống để tạo suất chiếu</span>
            </div>
            <div className="flex items-center gap-2">
              <FaEdit className="text-gray-600" />
              <span className="text-xs text-gray-600">Click vào suất chiếu để chỉnh sửa</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShowtimeTimelineView
