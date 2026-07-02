import { useEffect, useState } from 'react'
import {
  FaCalendarAlt,
  FaClock,
  FaFilter,
  FaPlay,
  FaSearch,
  FaSpinner,
  FaTicketAlt,
} from 'react-icons/fa'
import { Link, useSearchParams } from 'react-router-dom'
import Header from '../../components/Header'
import { movieService } from '../../services/movieService'
import { showtimeService } from '../../services/showtimeApi'

export default function ShowtimePage() {
  const [searchParams] = useSearchParams()
  const [showtimes, setShowtimes] = useState([])
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedMovie, setSelectedMovie] = useState('')
  const [selectedFormat, setSelectedFormat] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Get today and next 7 days for date selection
  const getAvailableDates = () => {
    const dates = []
    const today = new Date()
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      dates.push({
        value: date.toISOString().split('T')[0],
        label:
          i === 0
            ? 'Hôm nay'
            : i === 1
              ? 'Ngày mai'
              : date.toLocaleDateString('vi-VN', {
                  weekday: 'short',
                  day: '2-digit',
                  month: '2-digit',
                }),
      })
    }
    return dates
  }

  const formatTime = (dateTimeString) => {
    return new Date(dateTimeString).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  const formatDate = (dateTimeString) => {
    return new Date(dateTimeString).toLocaleDateString('vi-VN')
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price)
  }

  const getFormatLabel = (format) => {
    const formatMap = {
      '2D': '2D',
      '3D': '3D',
      'IMAX': 'IMAX',
    }
    return formatMap[format] || format
  }

  const getStatusColor = (status) => {
    const statusColors = {
      'SCHEDULED': 'bg-blue-600',
      'ONGOING': 'bg-green-600',
      'COMPLETED': 'bg-gray-600',
      'CANCELED': 'bg-red-600',
    }
    return statusColors[status] || 'bg-gray-600'
  }

  const getStatusLabel = (status) => {
    const statusLabels = {
      'SCHEDULED': 'Đã lên lịch',
      'ONGOING': 'Đang chiếu',
      'COMPLETED': 'Hoàn thành',
      'CANCELED': 'Đã hủy',
    }
    return statusLabels[status] || status
  }

  const fetchShowtimes = async () => {
    try {
      setLoading(true)
      setError(null)

      const dateTo = new Date(selectedDate)
      dateTo.setDate(dateTo.getDate() + 1)

      const response = await showtimeService.getShowtimes(
        currentPage,
        12, // Show 12 showtimes per page
        searchTerm,
        selectedMovie,
        '', // roomId
        selectedFormat,
        'SCHEDULED', // Only show scheduled showtimes
        selectedDate,
        dateTo.toISOString().split('T')[0],
        true, // excludeEnded - only show showtimes that haven't ended
      )

      if (response.data) {
        setShowtimes(response.data.data || [])
        if (response.data.paging) {
          setTotalPages(Math.ceil(response.data.paging.total / response.data.paging.size))
        }
      }
    } catch (err) {
      console.error('Error fetching showtimes:', err)
      setError('Không thể tải lịch chiếu. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  const fetchMovies = async () => {
    try {
      const response = await movieService.getAllMovies()
      if (response.data?.movies) {
        setMovies(response.data.movies)
      }
    } catch (err) {
      console.error('Error fetching movies:', err)
    }
  }

  useEffect(() => {
    fetchMovies()
    // Check if movie_id is in URL query parameters
    const movieId = searchParams.get('movie_id')
    if (movieId) {
      setSelectedMovie(movieId)
    }
  }, [searchParams])

  useEffect(() => {
    fetchShowtimes()
  }, [currentPage, selectedDate, selectedMovie, selectedFormat, searchTerm])

  const handleDateChange = (date) => {
    setSelectedDate(date)
    setCurrentPage(1)
  }

  const handleMovieChange = (movieId) => {
    setSelectedMovie(movieId)
    setCurrentPage(1)
  }

  const handleFormatChange = (format) => {
    setSelectedFormat(format)
    setCurrentPage(1)
  }

  const handleSearch = (term) => {
    setSearchTerm(term)
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setSelectedMovie('')
    setSelectedFormat('')
    setSearchTerm('')
    setCurrentPage(1)
  }

  const getMovieInfo = (movieId) => {
    return movies.find((movie) => movie.id === movieId)
  }

  const availableDates = getAvailableDates()

  return (
    <div className="min-h-screen bg-black">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Lịch Chiếu Phim</h1>
          <p className="text-gray-400 text-lg">Chọn suất chiếu phù hợp với bạn</p>
        </div>

        {/* Date Selection */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <FaCalendarAlt className="mr-2 text-red-600" />
            Chọn ngày
          </h2>
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {availableDates.map((date) => (
              <button
                key={date.value}
                onClick={() => handleDateChange(date.value)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all duration-300 ${
                  selectedDate === date.value
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {date.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <FaFilter className="mr-2 text-red-600" />
              Bộ lọc
            </h2>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors duration-300"
            >
              {showFilters ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
            </button>
          </div>

          <div className={`${showFilters ? 'block' : 'hidden'} lg:block`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Search */}
              <div className="relative">
                <FaSearch className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm phim..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-red-600"
                />
              </div>

              {/* Movie Filter */}
              <select
                value={selectedMovie}
                onChange={(e) => handleMovieChange(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-red-600"
              >
                <option value="">Tất cả phim</option>
                {movies.map((movie) => (
                  <option key={movie.id} value={movie.id}>
                    {movie.title}
                  </option>
                ))}
              </select>

              {/* Format Filter */}
              <select
                value={selectedFormat}
                onChange={(e) => handleFormatChange(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-red-600"
              >
                <option value="">Tất cả định dạng</option>
                <option value="2D">2D</option>
                <option value="3D">3D</option>
                <option value="IMAX">IMAX</option>
              </select>
            </div>

            {/* Clear Filters */}
            {(selectedMovie || selectedFormat || searchTerm) && (
              <button
                onClick={clearFilters}
                className="text-red-400 hover:text-red-300 font-medium transition-colors duration-300"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <FaSpinner className="animate-spin text-4xl text-red-600" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-red-400 text-lg mb-4">{error}</p>
            <button
              onClick={fetchShowtimes}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors duration-300"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Showtimes Grid */}
        {!loading && !error && (
          <>
            {showtimes.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 text-lg">Không có suất chiếu nào trong ngày này.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {showtimes.map((showtime) => {
                  const movie = getMovieInfo(showtime.movie_id)
                  return (
                    <div
                      key={showtime.id}
                      className="bg-gray-900 rounded-xl overflow-hidden hover:transform hover:scale-105 transition-all duration-300"
                    >
                      {/* Movie Poster & Info */}
                      <div className="relative">
                        {movie?.poster_url ? (
                          <img
                            src={movie.poster_url}
                            alt={movie.title || 'Movie'}
                            className="w-full h-48 object-cover"
                          />
                        ) : (
                          <div className="w-full h-48 bg-gray-800 flex items-center justify-center">
                            <div className="text-center text-gray-400">
                              <div className="text-4xl mb-2">🎬</div>
                              <div className="text-sm">Không có poster</div>
                            </div>
                          </div>
                        )}
                        <div className="absolute top-2 right-2 flex space-x-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(showtime.status)}`}
                          >
                            {getStatusLabel(showtime.status)}
                          </span>
                          <span className="bg-black/70 text-white px-2 py-1 rounded-full text-xs font-medium">
                            {getFormatLabel(showtime.format)}
                          </span>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                      </div>

                      {/* Showtime Details */}
                      <div className="p-6">
                        <h3 className="text-xl font-semibold text-white mb-2 line-clamp-1">
                          {movie?.title || 'Unknown Movie'}
                        </h3>

                        <div className="space-y-3 mb-4">
                          {/* Time & Date */}
                          <div className="flex items-center text-gray-300">
                            <FaClock className="mr-2 text-red-600" />
                            <span>
                              {formatTime(showtime.start_time)} - {formatTime(showtime.end_time)}
                            </span>
                          </div>

                          {/* Date */}
                          <div className="flex items-center text-gray-300">
                            <FaCalendarAlt className="mr-2 text-red-600" />
                            <span>{formatDate(showtime.start_time)}</span>
                          </div>

                          {/* Price */}
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Giá vé từ:</span>
                            <span className="text-red-400 font-semibold text-lg">
                              {formatPrice(showtime.base_price)}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex space-x-2">
                          <Link
                            to={`/showtimes/${showtime.id}/booking`}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-300 flex items-center justify-center space-x-2"
                          >
                            <FaTicketAlt />
                            <span>Đặt vé</span>
                          </Link>
                          {movie?.trailer_url && (
                            <a
                              href={movie.trailer_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg transition-colors duration-300"
                            >
                              <FaPlay />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300"
                >
                  Trước
                </button>

                <div className="flex space-x-1">
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    const pageNum = Math.max(1, currentPage - 2) + i
                    if (pageNum > totalPages) return null

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 rounded-lg font-medium transition-colors duration-300 ${
                          currentPage === pageNum
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300"
                >
                  Sau
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
