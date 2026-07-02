import { useCallback, useEffect, useState } from 'react'
import { FaPlus, FaSearch } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import MovieCard from '../../components/admin/MovieCard'
import { movieService } from '../../services/movieApi'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import LoadingSpinner from '../../components/common/LoadingSpinner'

export default function MoviesPage() {
  const [movies, setMovies] = useState([])
  const [meta, setMeta] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const navigate = useNavigate()

  const fetchMovies = useCallback(async (page = 1, size = 12, search = '') => {
    try {
      setLoading(page === 1)
      if (search) setSearching(true)

      const data = await movieService.getMovies(page, size, search)
      setMovies(data.data?.movies || [])
      setMeta(data.data?.meta || {})
      setError('')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load movies')
      console.error('Error fetching movies:', err)
    } finally {
      setLoading(false)
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    fetchMovies().then()
  }, [fetchMovies])

  const handleSearch = (e) => {
    e.preventDefault()
    fetchMovies(1, 12, searchQuery).then()
  }

  const handleSearchChange = (e) => {
    const value = e.target.value
    setSearchQuery(value)

    if (value === '') {
      fetchMovies(1, 12, '').then()
    }
  }

  const handlePageChange = (newPage) => {
    fetchMovies(newPage, meta.size, searchQuery).then()
    window.scrollTo(0, 0)
  }

  const clearSearch = () => {
    setSearchQuery('')
    fetchMovies(1, 12, '').then()
  }

  if (loading && !searching) {
    return (
      <AdminLayout>
        <LoadingSpinner size="lg" text="Đang tải danh sách phim..." />
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Card>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Quản lý phim</h1>
              <p className="text-gray-600">Quản lý danh sách phim trong hệ thống rạp</p>
            </div>

            <Button onClick={() => navigate('/admin/movies/new')}>
              <FaPlus size={16} />
              <span>Thêm phim mới</span>
            </Button>
          </div>
        </Card>

        <Card>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Tìm kiếm phim theo tên..."
                className="w-full pl-4 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
            <Button type="submit" disabled={searching}>
              <FaSearch />
              <span>{searching ? 'Đang tìm...' : 'Tìm kiếm'}</span>
            </Button>
          </form>

          {searchQuery && (
            <div className="mt-3 text-sm text-gray-600">
              {searching ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-200 border-t-red-600 rounded-full animate-spin"></div>
                  <span>Đang tìm kiếm...</span>
                </div>
              ) : (
                <span>
                  Kết quả tìm kiếm cho "<strong className="text-gray-800">{searchQuery}</strong>"
                  {meta.total !== undefined && ` (${meta.total} phim được tìm thấy)`}
                </span>
              )}
            </div>
          )}
        </Card>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
            <div className="flex items-start">
              <span className="text-red-500 text-xl mr-3">⚠</span>
              <div>
                <h3 className="text-sm font-semibold text-red-800">Lỗi tải dữ liệu</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        <Card padding="none">
          {movies.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🎬</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchQuery ? 'Không tìm thấy phim nào' : 'Chưa có phim nào'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchQuery
                  ? `Không có phim nào khớp với từ khóa "${searchQuery}"`
                  : 'Hãy thêm phim đầu tiên vào hệ thống'}
              </p>
              {!searchQuery && (
                <Button onClick={() => navigate('/admin/movies/new')}>
                  <FaPlus />
                  <span>Thêm phim đầu tiên</span>
                </Button>
              )}
            </div>
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {movies.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} />
                ))}
              </div>
            </div>
          )}
        </Card>

        {meta.total_pages > 1 && (
          <Card>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-sm text-gray-600">
                Trang {meta.page} / {meta.total_pages} • Tổng {meta.total} phim
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(meta.page - 1)}
                  disabled={meta.page <= 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ← Trước
                </button>

                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, meta.total_pages) }, (_, i) => {
                    const pageNum = Math.max(1, meta.page - 2) + i
                    if (pageNum > meta.total_pages) return null

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                          meta.page === pageNum
                            ? 'bg-red-600 text-white font-semibold'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(meta.page + 1)}
                  disabled={meta.page >= meta.total_pages}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Sau →
                </button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </AdminLayout>
  )
}
