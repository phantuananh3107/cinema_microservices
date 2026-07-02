import { useNavigate } from 'react-router-dom'
import Badge from '../common/Badge'

export default function MovieCard({ movie }) {
  const navigate = useNavigate()

  const getStatusBadge = (status) => {
    const styles = {
      UPCOMING: 'warning',
      SHOWING: 'success',
      ENDED: 'default',
    }
    return styles[status] || 'default'
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'TBA'
    return new Date(dateString).toLocaleDateString('vi-VN')
  }

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  return (
    <div
      onClick={() => navigate(`/admin/movies/${movie.id}`)}
      className="bg-white border border-gray-100 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg flex flex-col h-full"
    >
      {movie.poster_url && (
        <div className="w-full h-72 overflow-hidden bg-gray-100">
          <img
            src={movie.poster_url}
            alt={movie.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-base font-semibold text-gray-900 mb-3 line-clamp-2 min-h-[3rem]">
          {movie.title}
        </h3>

        <div className="mb-3">
          <Badge variant={getStatusBadge(movie.status)}>
            {movie.status?.replace('_', ' ')}
          </Badge>
        </div>

        <div className="text-sm text-gray-600 space-y-1.5">
          <div className="truncate">
            <span className="font-medium text-gray-700">Director:</span>{' '}
            <span className="truncate" title={movie.director}>
              {movie.director || 'Unknown'}
            </span>
          </div>

          <div className="truncate">
            <span className="font-medium text-gray-700">Genre:</span>{' '}
            <span className="truncate" title={movie.genre}>
              {movie.genres.join(', ') || 'Unknown'}
            </span>
          </div>

          <div className="truncate">
            <span className="font-medium text-gray-700">Duration:</span> {formatDuration(movie.duration)}
          </div>

          <div className="truncate">
            <span className="font-medium text-gray-700">Release:</span> {formatDate(movie.release_date)}
          </div>
        </div>
      </div>
    </div>
  )
}
