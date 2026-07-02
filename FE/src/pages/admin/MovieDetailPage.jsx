import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import { movieService } from '../../services/movieApi'

export default function MovieDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [movie, setMovie] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchMovie()
  }, [id])

  const fetchMovie = async () => {
    try {
      setLoading(true)
      const data = await movieService.getMovieById(id)
      setMovie(data.data)
      setError('')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load movie')
      console.error('Error fetching movie:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus) => {
    try {
      setUpdating(true)
      await movieService.updateMovieStatus(id, newStatus)
      setMovie({ ...movie, status: newStatus })
    } catch (err) {
      alert('Failed to update movie status: ' + (err.response?.data?.message || err.message))
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this movie?')) return

    try {
      await movieService.deleteMovie(id)
      navigate('/admin/movies')
    } catch (err) {
      alert('Failed to delete movie: ' + (err.response?.data?.message || err.message))
    }
  }

  const getStatusColorClasses = (status) => {
    switch (status) {
      case 'UPCOMMING':
        return 'bg-orange-500'
      case 'SHOWING':
        return 'bg-green-500'
      case 'ENDED':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusBorderClasses = (status) => {
    switch (status) {
      case 'upcoming':
        return 'border-orange-500'
      case 'showing':
        return 'border-green-500'
      case 'ended':
        return 'border-red-500'
      default:
        return 'border-gray-500'
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'TBA'
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center py-10">
          <div>Loading movie...</div>
        </div>
      </AdminLayout>
    )
  }

  if (error || !movie) {
    return (
      <AdminLayout>
        <div>
          <div className="bg-red-50 text-red-800 p-4 rounded mb-6">
            {error || 'Movie not found'}
          </div>
          <button
            onClick={() => navigate('/admin/movies')}
            className="bg-blue-600 text-white border-none py-3 px-6 rounded cursor-pointer hover:bg-blue-700 transition-colors"
          >
            Back to Movies
          </button>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div>
        {/* Navigation */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/admin/movies')}
            className="bg-transparent border border-gray-300 py-2 px-4 rounded cursor-pointer mr-4 hover:bg-gray-50 transition-colors"
          >
            ← Back to Movies
          </button>
          <button
            onClick={() => navigate(`/admin/movies/${id}/edit`)}
            className="bg-orange-500 text-white border-none py-2 px-4 rounded cursor-pointer mr-4 hover:bg-orange-600 transition-colors"
          >
            Edit Movie
          </button>
          <button
            onClick={handleDelete}
            className="bg-red-500 text-white border-none py-2 px-4 rounded cursor-pointer hover:bg-red-600 transition-colors"
          >
            Delete Movie
          </button>
        </div>

        <div className="bg-white rounded-lg p-8 shadow-md">
          <div className="flex gap-8 flex-wrap">
            {/* Poster */}
            {movie.poster_url && (
              <div className="flex-none w-[300px]">
                <img
                  src={movie.poster_url}
                  alt={movie.title}
                  className="w-full h-auto rounded-lg shadow-lg"
                />
              </div>
            )}

            {/* Details */}
            <div className="flex-1 min-w-[300px]">
              <h1 className="m-0 mb-4 text-3xl font-bold">
                {movie.title}
              </h1>

              {/* Status */}
              <div className="mb-6">
                <span
                  className={`${getStatusColorClasses(movie.status)} text-white py-1.5 px-3 rounded-full text-sm font-bold uppercase inline-block`}
                >
                  {movie.status?.replace('_', ' ')}
                </span>
              </div>

              {/* Basic Info */}
              <div className="mb-6">
                <div className="mb-3">
                  <strong>Đạo diễn:</strong> {movie.director || 'Unknown'}
                </div>
                <div className="mb-3">
                  <strong>Diễn viên:</strong> {movie.cast || 'Unknown'}
                </div>
                <div className="mb-3">
                  <strong>Thể loại:</strong> {movie.genre || 'Unknown'}
                </div>
                <div className="mb-3">
                  <strong>Thời lượng:</strong> {formatDuration(movie.duration)}
                </div>
                <div className="mb-3">
                  <strong>Ngày ra mắt:</strong> {formatDate(movie.release_date)}
                </div>
              </div>

              {/* Status Update */}
              <div className="mb-6">
                <strong>Thay đổi trạng thái:</strong>
                <div className="mt-2 flex gap-2 flex-wrap">
                  {['upcoming', 'showing', 'ended'].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      disabled={updating || movie.status === status}
                      className={`
                        ${movie.status === status ? `${getStatusColorClasses(status)} text-white` : 'bg-white text-gray-800'}
                        border-2 ${getStatusBorderClasses(status)}
                        py-1.5 px-3 rounded capitalize
                        ${updating || movie.status === status ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:opacity-80'}
                        transition-opacity
                      `}
                    >
                      {status.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {movie.description && (
            <div className="mt-8">
              <h3 className="mb-3 font-semibold text-lg">Thông tin</h3>
              <p className="leading-relaxed text-gray-600">{movie.description}</p>
            </div>
          )}

          {/* Trailer */}
          {movie.trailer_url && (
            <div className="mt-8">
              <h3 className="mb-3 font-semibold text-lg">Trailer</h3>
              <a
                href={movie.trailer_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 no-underline text-base hover:text-blue-700 hover:underline transition-colors"
              >
                🎬 Watch Trailer
              </a>
            </div>
          )}

          {/* Timestamps */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-sm text-gray-400">
            <div>Ngày tạo: {formatDate(movie.created_at)}</div>
            {movie.updated_at && movie.updated_at !== movie.created_at && (
              <div>Ngày chỉnh sửa: {formatDate(movie.updated_at)}</div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
