import { FaCalendarAlt } from 'react-icons/fa'

export default function ComingSoonCard({ movie }) {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN')
  }

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden hover:transform hover:scale-105 transition-all duration-300 group">
      <div className="relative">
        <img
          src={movie.poster_url}
          alt={movie.title}
          className="w-full h-96 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-2xl font-bold text-white mb-2">{movie.title}</h3>
          <div className="flex items-center justify-between">
            <span className="text-gray-300 text-sm">{movie.genre || 'Phim'}</span>
            <div className="flex items-center space-x-2 text-red-400">
              <FaCalendarAlt className="w-4 h-4" />
              <span className="text-sm font-medium">
                {movie.release_date ? formatDate(movie.release_date) : 'Sắp công bố'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}