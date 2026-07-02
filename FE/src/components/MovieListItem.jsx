import { useState } from 'react'
import { FaFilm, FaClock, FaCalendar, FaStar, FaSpinner } from 'react-icons/fa'
import { showtimeService } from '../services/showtimeApi'

export default function MovieListItem({
  movie,
  onShowtimesLoaded,
  formatDate,
  formatDuration,
}) {
  const [isLoadingShowtimes, setIsLoadingShowtimes] = useState(false)

  const handleViewShowtimes = async (e) => {
    e.preventDefault()
    setIsLoadingShowtimes(true)
    try {
      const response = await showtimeService.getShowtimesByMovie(movie.id, true)

      const showtimesData = response.data?.data || response.data || []
      onShowtimesLoaded(movie.id, showtimesData)
    } catch (error) {
      onShowtimesLoaded(movie.id, [])
    } finally {
      setIsLoadingShowtimes(false)
    }
  }

  return (
    <div className="group bg-gray-800/50 backdrop-blur-sm rounded-lg overflow-hidden hover:shadow-2xl hover:shadow-red-500/30 transition-all duration-300 transform hover:-translate-y-2">
      {/* Movie Poster */}
      <div className="relative h-96 overflow-hidden">
        {movie.poster_url ? (
          <img
            src={movie.poster_url}
            alt={movie.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
            <FaFilm className="text-gray-600 text-6xl" />
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-2 left-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              movie.status === 'SHOWING'
                ? 'bg-green-500 text-white'
                : movie.status === 'UPCOMING'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-500 text-white'
            }`}
          >
            {movie.status === 'SHOWING'
              ? 'Đang chiếu'
              : movie.status === 'UPCOMING'
                ? 'Sắp chiếu'
                : 'Đã kết thúc'}
          </span>
        </div>

        {/* Rating Badge */}
        {movie.rating && (
          <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1">
            <FaStar className="text-yellow-400 text-sm" />
            <span className="text-white text-sm font-bold">{movie.rating}</span>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-900 to-transparent" />
      </div>

      {/* Movie Info */}
      <div className="p-4">
        <h3 className="text-white font-bold text-lg mb-2 line-clamp-2 group-hover:text-red-400 transition-colors">
          {movie.title}
        </h3>

        <div className="space-y-2 text-sm">
          {/* Genre */}
          {movie.genre && (
            <p className="text-gray-400">
              <span className="text-red-400">Thể loại:</span> {movie.genre}
            </p>
          )}

          {/* Duration */}
          {movie.duration && (
            <div className="flex items-center gap-2 text-gray-400">
              <FaClock className="text-red-400" />
              <span>{formatDuration(movie.duration)}</span>
            </div>
          )}

          {/* Release Date */}
          {movie.release_date && (
            <div className="flex items-center gap-2 text-gray-400">
              <FaCalendar className="text-red-400" />
              <span>{formatDate(movie.release_date)}</span>
            </div>
          )}
        </div>

        {/* Director */}
        {movie.director && (
          <p className="text-gray-500 text-xs mt-3 line-clamp-1">
            Đạo diễn: {movie.director}
          </p>
        )}
      </div>

      {/* Hover Action */}
      {movie.status !== 'UPCOMING' && (
        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={handleViewShowtimes}
            disabled={isLoadingShowtimes}
            className="w-full bg-gradient-to-r from-red-600 to-red-800 text-white text-center py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-medium hover:from-red-700 hover:to-red-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoadingShowtimes ? (
              <>
                <FaSpinner className="animate-spin text-sm" />
                Đang tải...
              </>
            ) : (
              'Xem lịch chiếu'
            )}
          </button>
        </div>
      )}
    </div>
  )
}