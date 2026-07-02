import { useEffect, useState } from 'react'
import { FaArrowRight, FaClock, FaSpinner } from 'react-icons/fa'
import { Link } from 'react-router-dom'
import Header from '../../components/Header'
import MovieCard from '../../components/MovieCard'
import ComingSoonCard from '../../components/ComingSoonCard'
import HeroSection from '../../components/HeroSection'
import FeaturesSection from '../../components/FeaturesSection'
import Footer from '../../components/Footer'
import { movieService } from '../../services/movieService'

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [nowShowingMovies, setNowShowingMovies] = useState([])
  const [comingSoonMovies, setComingSoonMovies] = useState([])
  const [heroMovies, setHeroMovies] = useState([])
  const [loading, setLoading] = useState({
    nowShowing: true,
    comingSoon: true,
    hero: true,
  })
  const [error, setError] = useState({
    nowShowing: null,
    comingSoon: null,
    hero: null,
  })

  // Fetch data from APIs
  const fetchMovieData = async () => {
    try {
      // Fetch all movies first
      const allMoviesResponse = await movieService.getAllMovies()
      const allMovies = allMoviesResponse.data?.movies || []

      // Filter movies by status
      const nowShowing = allMovies.filter((movie) => movie.status === 'SHOWING')
      const upcoming = allMovies.filter((movie) => movie.status === 'UPCOMING')

      setNowShowingMovies(nowShowing)
      setLoading((prev) => ({ ...prev, nowShowing: false }))

      // Use first 3 now showing movies for hero section, fallback to any movies
      const heroData = nowShowing.length > 0 ? nowShowing.slice(0, 3) : allMovies.slice(0, 3)
      setHeroMovies(heroData)
      setLoading((prev) => ({ ...prev, hero: false }))

      setComingSoonMovies(upcoming)
      setLoading((prev) => ({ ...prev, comingSoon: false }))
    } catch (err) {
      console.error('Error fetching movies:', err)
      setError((prev) => ({
        ...prev,
        nowShowing: 'Không thể tải phim đang chiếu',
        hero: 'Không thể tải dữ liệu',
        comingSoon: 'Không thể tải phim sắp chiếu',
      }))
      setLoading((prev) => ({ nowShowing: false, hero: false, comingSoon: false }))
    }
  }

  // Load data on component mount
  useEffect(() => {
    fetchMovieData()
  }, [])

  // Auto slide for hero section
  useEffect(() => {
    if (heroMovies.length > 0) {
      const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % heroMovies.length)
      }, 5000)
      return () => clearInterval(timer)
    }
  }, [heroMovies.length])

  // Helper function to format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN')
  }

  const LoadingSpinner = () => (
    <div className="flex justify-center items-center py-12">
      <FaSpinner className="animate-spin text-4xl text-red-600" />
    </div>
  )

  const ErrorMessage = ({ message }) => (
    <div className="text-center py-12">
      <p className="text-red-400 text-lg">{message}</p>
      <button
        onClick={fetchMovieData}
        className="mt-4 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors duration-300"
      >
        Thử lại
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-black">
      <Header />

      <HeroSection movies={heroMovies} loading={loading.hero} error={error.hero} onRetry={fetchMovieData} />

      {/* Now Showing Section */}
      <section className="py-16 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-3xl font-bold text-white">Phim đang chiếu</h2>
            <Link
              to="/movies"
              className="text-red-400 hover:text-red-300 font-medium flex items-center space-x-2 transition-colors duration-300"
            >
              <span>Xem tất cả</span>
              <FaArrowRight />
            </Link>
          </div>

          {loading.nowShowing ? (
            <LoadingSpinner />
          ) : error.nowShowing ? (
            <ErrorMessage message={error.nowShowing} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {nowShowingMovies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Coming Soon Section */}
      <section className="py-16 bg-black">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-3xl font-bold text-white">Phim sắp chiếu</h2>
            <Link
              to="/coming-soon"
              className="text-red-400 hover:text-red-300 font-medium flex items-center space-x-2 transition-colors duration-300"
            >
              <span>Xem tất cả</span>
              <FaArrowRight />
            </Link>
          </div>

          {loading.comingSoon ? (
            <LoadingSpinner />
          ) : error.comingSoon ? (
            <ErrorMessage message={error.comingSoon} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {comingSoonMovies.map((movie) => (
                <ComingSoonCard key={movie.id} movie={movie} />
              ))}
            </div>
          )}
        </div>
      </section>

      <FeaturesSection />

      <Footer />
    </div>
  )
}
