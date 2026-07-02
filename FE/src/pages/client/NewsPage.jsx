import { useEffect, useState } from 'react'
import { FaNewspaper, FaGlobe, FaHome, FaSpinner } from 'react-icons/fa'
import Header from '../../components/Header'
import NewsCard from '../../components/NewsCard'
import NewsDetailModal from '../../components/NewsDetailModal'
import CategoryFilter from '../../components/CategoryFilter'
import { newsService } from '../../services/newsService'

export default function NewsPage() {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState(null)
  const [selectedNews, setSelectedNews] = useState(null)

  useEffect(() => {
    fetchNews()
  }, [selectedCategory, page])

  const fetchNews = async () => {
    try {
      setLoading(true)
      const response = await newsService.getNewsSummaries(selectedCategory, page, 12)
      setNews(response.data || [])
      setPagination(response.pagination)
    } catch (error) {
      console.error('Failed to fetch news:', error)
      setNews([])
    } finally {
      setLoading(false)
    }
  }

  const categories = [
    { value: 'all', label: 'Tất cả', icon: FaNewspaper },
    { value: 'domestic', label: 'Trong nước', icon: FaHome },
    { value: 'international', label: 'Quốc tế', icon: FaGlobe },
  ]

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const handleNewsClick = (newsItem) => {
    setSelectedNews(newsItem)
  }

  const closeModal = () => {
    setSelectedNews(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900">
      <Header />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-red-900/20 to-purple-900/20 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 flex items-center gap-3">
            <FaNewspaper className="text-red-500" />
            Tin Tức Điện Ảnh
          </h1>
          <p className="text-gray-300 text-lg">
            Cập nhật tin tức mới nhất về thế giới điện ảnh trong và ngoài nước
          </p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <CategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onChange={(value) => {
            setSelectedCategory(value)
            setPage(1)
          }}
        />

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <FaSpinner className="animate-spin text-red-500 text-5xl" />
          </div>
        ) : news.length === 0 ? (
          <div className="text-center py-20">
            <FaNewspaper className="mx-auto text-gray-600 text-6xl mb-4" />
            <p className="text-gray-400 text-xl">Chưa có tin tức nào</p>
          </div>
        ) : (
          <>
            {/* News Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {news.map((item) => (
                <NewsCard
                  key={item.id}
                  item={item}
                  onClick={() => handleNewsClick(item)}
                  formatDate={formatDate}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.total_pages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-12">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-6 py-2 bg-gray-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
                >
                  Trang trước
                </button>
                <span className="text-gray-300">
                  Trang {page} / {pagination.total_pages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
                  disabled={page === pagination.total_pages}
                  className="px-6 py-2 bg-gray-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
                >
                  Trang sau
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal for News Detail */}
      {selectedNews && <NewsDetailModal news={selectedNews} onClose={closeModal} formatDate={formatDate} />}
    </div>
  )
}
