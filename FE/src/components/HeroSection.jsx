import { useState, useEffect } from 'react'
import { FaPlay, FaStar, FaClock, FaTicketAlt, FaSpinner } from 'react-icons/fa'
import { Link } from 'react-router-dom'

export default function HeroSection({ movies, loading, error, onRetry }) {
  const [currentSlide, setCurrentSlide] = useState(0)

  // Auto slide for hero section
  useEffect(() => {
    if (movies.length > 0) {
      const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % movies.length)
      }, 5000)
      return () => clearInterval(timer)
    }
  }, [movies.length])

  const LoadingSpinner = () => (
    <div className="flex justify-center items-center py-12">
      <FaSpinner className="animate-spin text-4xl text-red-600" />
    </div>
  )

  const ErrorMessage = ({ message }) => (
    <div className="text-center py-12">
      <p className="text-red-400 text-lg">{message}</p>
      <button
        onClick={onRetry}
        className="mt-4 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors duration-300"
      >
        Thử lại
      </button>
    </div>
  )

  return (
    <section className="relative h-[70vh] overflow-hidden">
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <ErrorMessage message={error} />
        </div>
      ) : movies.length > 0 ? (
        movies.map((movie, index) => {
          return (
            <div
              key={movie.id}
              className={`absolute inset-0 transition-transform duration-1000 ease-in-out ${
                index === currentSlide ? 'translate-x-0' : 'translate-x-full'
              }`}
            >
              <img
                src={movie.poster_url}
                alt={movie.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60"></div>
              <div className="absolute inset-0 flex items-center">
                <div className="max-w-7xl mx-auto px-4 w-full">
                  <div className="max-w-2xl">
                    <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
                      {movie.title}
                    </h1>
                    <p className="text-xl text-gray-200 mb-6">{movie.description}</p>
                    <div className="flex items-center space-x-6 mb-8">
                      <div className="flex items-center space-x-2">
                        <FaStar className="text-yellow-400" />
                        <span className="text-white font-medium">{movie.rating || 'N/A'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FaClock className="text-gray-400" />
                        <span className="text-gray-300">
                          {movie.duration ? `${movie.duration} phút` : 'N/A'}
                        </span>
                      </div>
                      <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                        {movie.genre || 'Phim'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <Link
                        to="/showtimes"
                        className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center space-x-2 transform hover:scale-105"
                      >
                        <FaTicketAlt />
                        <span>Đặt vé ngay</span>
                      </Link>
                      {movie.trailer_url && (
                        <a
                          href={movie.trailer_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-black px-8 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center space-x-2"
                        >
                          <FaPlay />
                          <span>Xem trailer</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <p className="text-gray-400 text-xl">Không có phim nào để hiển thị</p>
        </div>
      )}

      {/* Slide indicators */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-3">
        {movies.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentSlide ? 'bg-red-600 w-8' : 'bg-white/50'
            }`}
          />
        ))}
      </div>
    </section>
  )
}