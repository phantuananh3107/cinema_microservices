import { useEffect, useState } from 'react'
import { FaNewspaper, FaSpinner } from 'react-icons/fa'
import { useNavigate, useParams } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import { newsService } from '../../services/newsService'

export default function NewsFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    category: '',
    is_active: true,
    created_at: '',
  })

  useEffect(() => {
    if (id) {
      fetchNews()
    }
  }, [id])

  const fetchNews = async () => {
    try {
      setLoading(true)
      const data = await newsService.getNewsSummaryById(id)
      const newsItem = data.data

      setFormData({
        title: newsItem.title || '',
        summary: newsItem.summary || '',
        category: newsItem.category || '',
        is_active: newsItem.is_active !== undefined ? newsItem.is_active : true,
        created_at: newsItem.created_at || '',
      })
      setError('')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load news')
      console.error('Error fetching news:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.title?.trim()) {
      setError('Title is required')
      return
    }

    if (!formData.summary?.trim()) {
      setError('Summary is required')
      return
    }

    try {
      setSaving(true)
      await newsService.updateNewsSummary(id, formData.title, formData.summary)
      navigate('/admin/news')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update news')
      console.error('Error updating news:', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <FaSpinner className="animate-spin text-4xl text-red-600 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Đang tải tin tức...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
              <FaNewspaper className="text-white text-xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Chỉnh sửa tin tức</h1>
              <p className="text-gray-600">Cập nhật tiêu đề và nội dung tin tức AI tổng hợp</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-gradient-to-r from-red-50 to-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-sm">
            <div className="text-sm font-medium text-red-800">{error}</div>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleSubmit}>
            {/* Title (Editable) */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Tiêu đề <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                placeholder="Nhập tiêu đề tin tức..."
              />
            </div>

            {/* Summary (Editable) */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Tóm tắt <span className="text-red-600">*</span>
              </label>
              <textarea
                name="summary"
                value={formData.summary}
                onChange={handleChange}
                required
                rows="6"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                placeholder="Nhập nội dung tóm tắt..."
              />
            </div>

            {/* Category (Read-only) */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-900 mb-2">Danh mục</label>
              <input
                type="text"
                value={formData.category === 'domestic' ? 'Trong nước' : 'Quốc tế'}
                readOnly
                className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
              />
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Trạng thái</label>
                <input
                  type="text"
                  value={formData.is_active ? 'Active' : 'Inactive'}
                  readOnly
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Ngày tạo</label>
                <input
                  type="text"
                  value={
                    formData.created_at
                      ? new Date(formData.created_at).toLocaleDateString('vi-VN')
                      : ''
                  }
                  readOnly
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 justify-end pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/admin/news')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-medium"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <span>Lưu thay đổi</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  )
}
