import { useCallback, useEffect, useState } from 'react'
import { FaEdit, FaEye, FaEyeSlash } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import { newsService } from '../../services/newsService'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import LoadingSpinner from '../../components/common/LoadingSpinner'

export default function NewsPage() {
  const [news, setNews] = useState([])
  const [meta, setMeta] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [category, setCategory] = useState('all')
  const navigate = useNavigate()

  const fetchNews = useCallback(
    async (page = 1, size = 12, cat = category) => {
      try {
        setLoading(page === 1)

        const data = await newsService.getAllNewsSummaries(cat, page, size)
        setNews(data.data || [])
        setMeta(data.pagination || {})
        setError('')
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load news')
        console.error('Error fetching news:', err)
      } finally {
        setLoading(false)
      }
    },
    [category],
  )

  useEffect(() => {
    fetchNews()
  }, [fetchNews])

  const handleCategoryChange = (newCategory) => {
    setCategory(newCategory)
    fetchNews(1, 12, newCategory)
  }

  const handleToggleActive = async (id, currentStatus) => {
    const newStatus = !currentStatus
    const action = newStatus ? 'hiện' : 'ẩn'

    if (!window.confirm(`Bạn có chắc muốn ${action} tin tức này?`)) {
      return
    }

    try {
      await newsService.toggleNewsActive(id, newStatus)
      fetchNews(meta.current_page || 1, meta.page_size || 12)
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${action} news`)
      console.error('Error toggling news status:', err)
    }
  }

  const handlePageChange = (newPage) => {
    fetchNews(newPage, meta.page_size || 12)
    window.scrollTo(0, 0)
  }

  if (loading) {
    return (
      <AdminLayout>
        <LoadingSpinner size="lg" text="Đang tải danh sách tin tức..." />
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Card>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Quản lý tin tức</h1>
            <p className="text-gray-600">Quản lý tin tức AI tổng hợp trong hệ thống</p>
          </div>
        </Card>

        <Card>
          <div className="flex flex-wrap gap-3">
            {[
              { value: 'all', label: 'Tất cả' },
              { value: 'domestic', label: 'Trong nước' },
              { value: 'international', label: 'Quốc tế' },
            ].map((cat) => (
              <button
                key={cat.value}
                onClick={() => handleCategoryChange(cat.value)}
                className={`px-6 py-2 rounded-lg font-semibold transition-all duration-200 ${
                  category === cat.value
                    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
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
          {news.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📰</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Chưa có tin tức nào</h3>
              <p className="text-gray-500">Chưa có tin tức nào được tổng hợp</p>
            </div>
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {news.map((item) => (
                  <div
                    key={item.id}
                    className="border border-gray-100 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
                  >
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-48 object-cover"
                      />
                    )}

                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant={item.category === 'domestic' ? 'info' : 'default'}>
                          {item.category === 'domestic' ? 'Trong nước' : 'Quốc tế'}
                        </Badge>
                        <Badge variant={item.is_active ? 'success' : 'default'}>
                          {item.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>

                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                        {item.title}
                      </h3>

                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{item.summary}</p>

                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/admin/news/${item.id}/edit`)}
                          className="flex-1"
                        >
                          <FaEdit />
                          <span>Sửa</span>
                        </Button>
                        <button
                          onClick={() => handleToggleActive(item.id, item.is_active)}
                          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-semibold ${
                            item.is_active
                              ? 'bg-gray-600 hover:bg-gray-700 text-white'
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                        >
                          {item.is_active ? <FaEyeSlash /> : <FaEye />}
                          <span>{item.is_active ? 'Ẩn' : 'Hiện'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {meta.total_pages > 1 && (
          <Card>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-sm text-gray-600">
                Trang {meta.current_page} / {meta.total_pages} • Tổng {meta.total} tin tức
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(meta.current_page - 1)}
                  disabled={meta.current_page <= 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ← Trước
                </button>

                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, meta.total_pages) }, (_, i) => {
                    const pageNum = Math.max(1, meta.current_page - 2) + i
                    if (pageNum > meta.total_pages) return null

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                          meta.current_page === pageNum
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
                  onClick={() => handlePageChange(meta.current_page + 1)}
                  disabled={meta.current_page >= meta.total_pages}
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
