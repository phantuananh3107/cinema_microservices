import { useCallback, useEffect, useState } from 'react'
import {
  FaCheckCircle,
  FaCloudUploadAlt,
  FaExclamationTriangle,
  FaFileAlt,
  FaRobot,
  FaSpinner,
  FaTrash,
  FaEye,
  FaTimes,
} from 'react-icons/fa'
import AdminLayout from '../../components/admin/AdminLayout'
import { chatbotService } from '../../services/chatbotApi'

export default function ChatbotDocumentsPage() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [title, setTitle] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [viewChunks, setViewChunks] = useState(null)
  const [chunks, setChunks] = useState([])
  const [loadingChunks, setLoadingChunks] = useState(false)

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true)
      const data = await chatbotService.listDocuments(100, 0)
      setDocuments(data.documents || [])
      setError('')
    } catch (err) {
      setError(err.response?.data?.error || 'Không thể tải danh sách documents')
      console.error('Error fetching documents:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDocuments().then()
  }, [fetchDocuments])

  useEffect(() => {
    const hasProcessing = documents.some(doc => doc.status === 'processing')
    if (!hasProcessing) {
      return
    }

    const intervalId = setInterval(() => {
      fetchDocuments().then()
    }, 5000) 

    return () => clearInterval(intervalId)
  }, [documents, fetchDocuments])

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      validateAndSetFile(file)
    }
  }

  const validateAndSetFile = (file) => {
    const validTypes = ['.txt', '.md', '.pdf']
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase()
    const maxSize = 10 * 1024 * 1024 // 10MB

    if (!validTypes.includes(fileExtension)) {
      setError('Chỉ hỗ trợ file .txt, .md, .pdf')
      return
    }

    if (file.size > maxSize) {
      setError('Kích thước file không được vượt quá 10MB')
      return
    }

    setSelectedFile(file)
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ''))
    }
    setError('')
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0])
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()

    if (!selectedFile) {
      setError('Vui lòng chọn file để upload')
      return
    }

    try {
      setUploading(true)
      setError('')
      setSuccess('')

      await chatbotService.uploadDocument(selectedFile, title)

      setSuccess('Upload document thành công!')
      setSelectedFile(null)
      setTitle('')
      fetchDocuments()

      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      setError(err.response?.data?.error || 'Không thể upload document')
      console.error('Error uploading document:', err)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id, documentTitle) => {
    if (!window.confirm(`Bạn có chắc muốn xóa document "${documentTitle}"?`)) {
      return
    }

    try {
      await chatbotService.deleteDocument(id)
      setSuccess('Xóa document thành công!')
      fetchDocuments()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Không thể xóa document')
      console.error('Error deleting document:', err)
    }
  }

  const handleViewChunks = async (doc) => {
    try {
      setLoadingChunks(true)
      setViewChunks(doc)
      const data = await chatbotService.getDocumentChunks(doc.id)
      setChunks(data.chunks || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Không thể tải chunks')
      console.error('Error loading chunks:', err)
    } finally {
      setLoadingChunks(false)
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleString('vi-VN')
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      completed: { color: 'bg-green-100 text-green-800', text: 'Hoàn thành' },
      processing: { color: 'bg-yellow-100 text-yellow-800', text: 'Đang xử lý' },
      failed: { color: 'bg-red-100 text-red-800', text: 'Thất bại' },
    }

    const config = statusConfig[status] || statusConfig.processing
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.color}`}>
        {config.text}
      </span>
    )
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <FaSpinner className="animate-spin text-4xl text-red-600 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Đang tải danh sách documents...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <FaRobot className="text-white text-xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Quản lý Chatbot Documents</h1>
              <p className="text-gray-600">Upload và quản lý tài liệu cho AI Chatbot</p>
            </div>
          </div>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start space-x-3">
            <FaExclamationTriangle className="text-red-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">Lỗi</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
              <FaTimes />
            </button>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg flex items-start space-x-3">
            <FaCheckCircle className="text-green-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-green-800 font-medium">Thành công</p>
              <p className="text-green-700 text-sm">{success}</p>
            </div>
            <button onClick={() => setSuccess('')} className="text-green-500 hover:text-green-700">
              <FaTimes />
            </button>
          </div>
        )}

        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
            <FaCloudUploadAlt className="text-purple-600" />
            <span>Upload Document Mới</span>
          </h2>

          <form onSubmit={handleUpload} className="space-y-6">
            {/* Drag & Drop Area */}
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                dragActive
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <FaCloudUploadAlt className="text-5xl text-gray-400 mx-auto mb-4" />
              <p className="text-gray-700 font-medium mb-2">
                Kéo thả file vào đây hoặc click để chọn
              </p>
              <p className="text-sm text-gray-500 mb-4">Hỗ trợ: .txt, .md, .pdf (tối đa 10MB)</p>
              <input
                type="file"
                onChange={handleFileChange}
                accept=".txt,.md,.pdf"
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg cursor-pointer transition-colors duration-200"
              >
                Chọn file
              </label>
            </div>

            {/* Selected File Info */}
            {selectedFile && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FaFileAlt className="text-purple-600 text-2xl" />
                    <div>
                      <p className="font-medium text-gray-900">{selectedFile.name}</p>
                      <p className="text-sm text-gray-600">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null)
                      setTitle('')
                    }}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    <FaTimes size={20} />
                  </button>
                </div>
              </div>
            )}

            {/* Title Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tiêu đề (tùy chọn)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nhập tiêu đề cho document"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Upload Button */}
            <button
              type="submit"
              disabled={!selectedFile || uploading}
              className={`w-full py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2 ${
                !selectedFile || uploading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg hover:shadow-xl'
              }`}
            >
              {uploading ? (
                <>
                  <FaSpinner className="animate-spin" />
                  <span>Đang upload...</span>
                </>
              ) : (
                <>
                  <FaCloudUploadAlt />
                  <span>Upload Document</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Documents List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FaFileAlt className="text-purple-600" />
              <span>Danh sách Documents ({documents.length})</span>
            </div>
          </h2>

          {documents.length === 0 ? (
            <div className="text-center py-12">
              <FaFileAlt className="text-6xl text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Chưa có document nào</p>
              <p className="text-gray-400 text-sm">Upload document đầu tiên để bắt đầu</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tiêu đề
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Loại
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kích thước
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngày tạo
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FaFileAlt className="text-purple-600 mr-3" />
                          <div className="text-sm font-medium text-gray-900">{doc.title}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600 uppercase">{doc.file_type}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{formatFileSize(doc.size)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(doc.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{formatDate(doc.created_at)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-3">
                          <button
                            onClick={() => handleViewChunks(doc)}
                            className="text-purple-600 hover:text-purple-900 transition-colors"
                            title="Xem chunks"
                          >
                            <FaEye size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id, doc.title)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Xóa"
                          >
                            <FaTrash size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Chunks Modal */}
        {viewChunks && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Document Chunks</h3>
                  <p className="text-sm text-gray-600 mt-1">{viewChunks.title}</p>
                </div>
                <button
                  onClick={() => {
                    setViewChunks(null)
                    setChunks([])
                  }}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <FaTimes size={24} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1">
                {loadingChunks ? (
                  <div className="flex items-center justify-center py-12">
                    <FaSpinner className="animate-spin text-3xl text-purple-600" />
                  </div>
                ) : chunks.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">Không có chunks</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {chunks.map((chunk, index) => (
                      <div
                        key={chunk.id}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-purple-600">
                            Chunk #{chunk.chunk_index + 1}
                          </span>
                          <span className="text-xs text-gray-500">
                            {chunk.token_count} tokens
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {chunk.content}
                        </p>
                        {chunk.embedding && (
                          <div className="mt-2 text-xs text-gray-500">
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                              ✓ Đã có embedding
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => {
                    setViewChunks(null)
                    setChunks([])
                  }}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-semibold transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
