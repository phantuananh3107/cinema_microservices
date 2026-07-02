import { formatCurrency } from '../../../utils/formatters'
import LoadingSpinner from '../../common/LoadingSpinner'

export default function TopMoviesList({ movies, loading }) {
  const getRankBadgeClasses = (index) => {
    if (index === 0) return 'bg-gradient-to-br from-green-500 to-emerald-600'
    if (index === 1) return 'bg-gradient-to-br from-blue-500 to-indigo-600'
    if (index === 2) return 'bg-gradient-to-br from-purple-500 to-purple-600'
    return 'bg-gray-400'
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <h3 className="mb-6 text-lg font-semibold text-gray-900">
        Top 5 Phim (Trong Tuần)
      </h3>

      {loading ? (
        <div className="text-center py-16 px-6">
          <LoadingSpinner />
        </div>
      ) : movies.length === 0 ? (
        <div className="text-center py-16 px-6 text-gray-400">
          <p>No movie data available</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {movies.map((movie, index) => (
            <div
              key={movie.movie_id}
              className="flex items-center gap-4 p-4 bg-gray-50 border border-gray-100 rounded-lg transition-all duration-150 hover:bg-red-50 hover:border-red-100"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-base text-white ${getRankBadgeClasses(index)}`}
              >
                {index + 1}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm mb-1 text-gray-900 overflow-hidden text-ellipsis whitespace-nowrap">
                  {movie.movie_title}
                </div>
                <div className="text-xs text-gray-500">
                  {movie.total_tickets} tickets • {movie.total_bookings} bookings
                </div>
              </div>

              <div className="text-sm font-bold text-green-600 flex-shrink-0">
                {formatCurrency(movie.total_revenue)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
