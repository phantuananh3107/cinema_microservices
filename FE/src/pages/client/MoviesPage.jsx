import { useEffect, useState } from 'react'
import { FaFilm, FaSpinner } from 'react-icons/fa'
import Header from '../../components/Header'
import MovieFilterTabs from '../../components/MovieFilterTabs'
import MovieListItem from '../../components/MovieListItem'
import ShowtimesModal from '../../components/ShowtimesModal'
import { movieService } from '../../services/movieService'

export default function MoviesPage() {
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selectedMovieShowtimes, setSelectedMovieShowtimes] = useState(null)
  const [selectedMovie, setSelectedMovie] = useState(null)

  useEffect(() => {
    fetchMovies()
  }, [filter])

  const fetchMovies = async () => {
    try {
      setLoading(true)
      let response
      switch (filter) {
        case 'SHOWING':
          response = await movieService.getShowingMovies()
          break
        case 'UPCOMING':
          response = await movieService.getUpcomingMovies()
          break
        default:
          response = await movieService.getAllMovies()
      }

      setMovies(response.data?.movies || [])
    } catch (error) {
      console.error('Failed to fetch movies:', error)
      setMovies([])
    } finally {
      setLoading(false)
    }
  }

  const filters = [
    { value: 'all', label: 'Tất cả phim' },
    { value: 'SHOWING', label: 'Đang chiếu' },
    { value: 'UPCOMING', label: 'Sắp chiếu' },
  ]

  const formatDate = (dateString) => {
    if (!dateString) return 'TBA'
    const date = new Date(dateString)
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const handleShowtimesLoaded = (movieId, showtimes) => {
    const movie = movies.find((m) => m.id === movieId)
    if (movie) {
      setSelectedMovie(movie)
      setSelectedMovieShowtimes(showtimes)
    }
  }

  const closeShowtimesModal = () => {
    setSelectedMovieShowtimes(null)
    setSelectedMovie(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900">
      <Header />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-red-900/20 to-purple-900/20 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 flex items-center gap-3">
            <FaFilm className="text-red-500" />
            Phim Đang Chiếu
          </h1>
          <p className="text-gray-300 text-lg">
            Khám phá những bộ phim mới nhất và đặt vé ngay hôm nay
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <MovieFilterTabs filters={filters} selectedFilter={filter} onChange={setFilter} />

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <FaSpinner className="animate-spin text-red-500 text-5xl" />
          </div>
        ) : movies.length === 0 ? (
          <div className="text-center py-20">
            <FaFilm className="mx-auto text-gray-600 text-6xl mb-4" />
            <p className="text-gray-400 text-xl">Không có phim nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {movies.map((movie) => (
              <MovieListItem
                key={movie.id}
                movie={movie}
                onShowtimesLoaded={handleShowtimesLoaded}
                formatDate={formatDate}
                formatDuration={formatDuration}
              />
            ))}
          </div>
        )}
      </div>

      {/* Showtimes Modal */}
      {selectedMovie && selectedMovieShowtimes !== null && (
        <ShowtimesModal
          movie={selectedMovie}
          showtimes={selectedMovieShowtimes}
          onClose={closeShowtimesModal}
          formatDate={formatDate}
          formatDuration={formatDuration}
        />
      )}
    </div>
  )
}