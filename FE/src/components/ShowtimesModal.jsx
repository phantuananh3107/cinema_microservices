import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaCalendar, FaClock, FaCouch } from 'react-icons/fa'

export default function ShowtimesModal({
  movie,
  showtimes,
  onClose,
  formatDate,
  formatDuration,
}) {
  const navigate = useNavigate()
  const [selectedShowtime, setSelectedShowtime] = useState(null)

  const handleSelectShowtime = (showtime) => {
    setSelectedShowtime(showtime)
  }

  const handleBooking = () => {
    if (selectedShowtime) {
      navigate(`/showtimes/${selectedShowtime.id}/booking`)
    }
  }

  // Group showtimes by date
  const groupedShowtimes = showtimes.reduce((acc, showtime) => {
    const date = new Date(showtime.start_time).toLocaleDateString('vi-VN')
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(showtime)
    return acc
  }, {})

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-red-400 text-3xl z-10"
        >
          ×
        </button>

        {/* Movie Header */}
        <div className="bg-gradient-to-r from-red-900/20 to-purple-900/20 p-6 border-b border-gray-800">
          <h2 className="text-2xl font-bold text-white mb-2">{movie.title}</h2>
          {movie.duration && (
            <p className="text-gray-400 text-sm flex items-center gap-2">
              <FaClock className="text-red-400" />
              Thời lượng: {formatDuration(movie.duration)}
            </p>
          )}
        </div>

        {/* Showtimes Content */}
        <div className="p-6">
          {showtimes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-lg">Không có lịch chiếu nào</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedShowtimes).map(([date, dayShowtimes]) => (
                <div key={date}>
                  <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                    <FaCalendar className="text-red-400" />
                    {date}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {dayShowtimes.map((showtime) => (
                      <button
                        key={showtime.id}
                        type="button"
                        onClick={() => handleSelectShowtime(showtime)}
                        className={`p-3 rounded-lg font-medium transition-all duration-300 flex flex-col items-center justify-center gap-2 ${
                          selectedShowtime?.id === showtime.id
                            ? 'bg-gradient-to-r from-red-600 to-red-800 text-white shadow-lg shadow-red-500/50'
                            : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-white'
                        }`}
                      >
                        <span className="text-lg">
                          {new Date(showtime.start_time).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className="text-xs flex items-center gap-1">
                          <FaCouch className="text-sm" />
                          Phòng {showtime.room?.name}
                        </span>
                        <span className="text-xs">{showtime.format}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="border-t border-gray-800 p-6 flex gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-3 rounded-lg font-medium bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 transition-colors"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleBooking}
            disabled={!selectedShowtime}
            className="flex-1 px-6 py-3 rounded-lg font-medium bg-gradient-to-r from-red-600 to-red-800 text-white hover:from-red-700 hover:to-red-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Đặt vé
          </button>
        </div>
      </div>
    </div>
  )
}