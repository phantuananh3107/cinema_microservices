import { useState } from 'react'
import { FaPlay, FaTicketAlt, FaStar, FaSpinner } from 'react-icons/fa'
import { Link, useNavigate } from 'react-router-dom'
import { showtimeService } from '../services/showtimeApi'

export default function MovieCard({ movie }) {
  const navigate = useNavigate()
  const [isLoadingShowtimes, setIsLoadingShowtimes] = useState(false)

  const handleViewShowtimes = async (e) => {
    e.preventDefault()
    setIsLoadingShowtimes(true)
    try {
      await showtimeService.getShowtimesByMovie(movie.id, true)
      navigate(`/showtimes?movie_id=${movie.id}`)
    } catch (error) {
      console.error('Error fetching showtimes:', error)
      navigate(`/showtimes?movie_id=${movie.id}`)
    } finally {
      setIsLoadingShowtimes(false)
    }
  }

  return (
    <div className="bg-black/50 rounded-xl overflow-hidden hover:transform hover:scale-105 transition-all duration-300 group">
      <div className="relative">
        <img
          src={movie.poster_url}
          alt={movie.title}
          className="w-full h-80 object-cover"
        />
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          {movie.trailer_url ? (
            <a
              href={movie.trailer_url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-red-600 hover:bg-red-700 text-white p-4 rounded-full transform scale-75 group-hover:scale-100 transition-transform duration-300"
            >
              <FaPlay className="w-6 h-6" />
            </a>
          ) : (
            <Link
              to={`/movie/${movie.id}`}
              className="bg-red-600 hover:bg-red-700 text-white p-4 rounded-full transform scale-75 group-hover:scale-100 transition-transform duration-300"
            >
              <FaTicketAlt className="w-6 h-6" />
            </Link>
          )}
        </div>
        {movie.rating && (
          <div className="absolute top-4 right-4 bg-black/80 text-white px-2 py-1 rounded-md text-sm flex items-center space-x-1">
            <FaStar className="text-yellow-400 w-3 h-3" />
            <span>{movie.rating}</span>
          </div>
        )}
      </div>
      <div className="p-6">
        <h3 className="text-xl font-semibold text-white mb-2 line-clamp-2">
          {movie.title}
        </h3>
        <p className="text-gray-400 text-sm mb-4">{movie.genres?.join(', ') || 'Phim'}</p>
        <div className="space-y-2">
          <p className="text-gray-300 text-sm font-medium">
            Thời lượng: {movie.duration ? `${movie.duration} phút` : 'N/A'}
          </p>
          <button
            onClick={handleViewShowtimes}
            disabled={isLoadingShowtimes}
            className="block w-full bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white text-center py-2 rounded-md text-sm font-medium transition-colors duration-300 flex items-center justify-center gap-2"
          >
            {isLoadingShowtimes ? (
              <>
                <FaSpinner className="animate-spin w-4 h-4" />
                Đang tải...
              </>
            ) : (
              'Xem lịch chiếu'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}