import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import { movieService, getGenres, createMovie, updateMovie } from '../../services/movieService'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import Textarea from '../../components/common/Textarea'
import Card from '../../components/common/Card'
import LoadingSpinner from '../../components/common/LoadingSpinner'

export default function MovieFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = Boolean(id)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [genres, setGenres] = useState([])

  const [formData, setFormData] = useState({
    title: '',
    director: '',
    cast: '',
    genres: [],
    duration: '',
    release_date: '',
    description: '',
    trailer_url: '',
    poster_url: '',
    status: 'UPCOMING',
  })

  useEffect(() => {
    if (isEditing) {
      fetchMovie()
    }
  }, [id, isEditing])

  useEffect(() => {
    fetchGenres()
  }, [])

  const fetchGenres = async () => {
    try {
      const response = await getGenres()
      setGenres(response.data || [])
    } catch (err) {
      throw err
    }
  }

  const fetchMovie = async () => {
    try {
      setLoading(true)
      const data = await movieService.getMovieById(id)
      const movie = data.data

      setFormData({
        title: movie.title || '',
        director: movie.director || '',
        cast: movie.cast || '',
        genres: (movie.genres || []).map(g => g.id || g),
        duration: movie.duration?.toString() || '',
        release_date: movie.release_date ? movie.release_date.split('T')[0] : '',
        description: movie.description || '',
        trailer_url: movie.trailer_url || '',
        poster_url: movie.poster_url || '',
        status: movie.status || 'UPCOMING',
      })
      setError('')
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải thông tin phim')
      console.error('Error fetching movie:', err)
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

  const handleGenreChange = (genreId, checked) => {
    setFormData((prev) => ({
      ...prev,
      genres: checked
        ? [...prev.genres, genreId]
        : prev.genres.filter(g => g !== genreId)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.title?.trim() || !formData.duration) {
      setError('Tên phim và thời lượng là bắt buộc')
      return
    }

    let release_date = null
    if (formData.release_date) {
      release_date = new Date(formData.release_date + 'T00:00:00Z').toISOString()
    }

    const movieData = {
      ...formData,
      duration: parseInt(formData.duration, 10) || 0,
      release_date: release_date,
    }

    try {
      setSaving(true)

      if (isEditing) {
        await updateMovie(id, movieData)
      } else {
        await createMovie(movieData)
      }

      navigate('/admin/movies')
    } catch (err) {
      setError(err.response?.data?.message || `Không thể ${isEditing ? 'cập nhật' : 'tạo'} phim`)
      console.error(`Error ${isEditing ? 'updating' : 'creating'} movie:`, err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <LoadingSpinner size="lg" text="Đang tải phim..." />
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/movies')} className="mb-4">
            ← Quay lại danh sách phim
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditing ? 'Chỉnh sửa phim' : 'Thêm phim mới'}
          </h1>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
            <div className="flex items-start">
              <span className="text-red-500 text-xl mr-3">⚠</span>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Tên phim"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="Nhập tên phim"
            />

            <Input
              label="Đạo diễn"
              name="director"
              value={formData.director}
              onChange={handleChange}
              placeholder="Nhập tên đạo diễn"
            />

            <Input
              label="Diễn viên"
              name="cast"
              value={formData.cast}
              onChange={handleChange}
              placeholder="Nhập tên diễn viên chính (cách nhau bởi dấu phẩy)"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Thể loại
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {genres.map((genre) => (
                    <label key={genre.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.genres.includes(genre.id)}
                        onChange={(e) => handleGenreChange(genre.id, e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm">{genre.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Input
                label="Thời lượng (phút)"
                name="duration"
                type="number"
                value={formData.duration}
                onChange={handleChange}
                required
                min="1"
                placeholder="120"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Ngày phát hành"
                name="release_date"
                type="date"
                value={formData.release_date}
                onChange={handleChange}
              />

              <Select
                label="Trạng thái"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="UPCOMING">Sắp chiếu</option>
                <option value="SHOWING">Đang chiếu</option>
                <option value="ENDED">Đã kết thúc</option>
              </Select>
            </div>

            <Input
              label="URL Poster"
              name="poster_url"
              type="url"
              value={formData.poster_url}
              onChange={handleChange}
              placeholder="https://example.com/poster.jpg"
            />

            <Input
              label="URL Trailer"
              name="trailer_url"
              type="url"
              value={formData.trailer_url}
              onChange={handleChange}
              placeholder="https://www.youtube.com/watch?v=..."
            />

            <Textarea
              label="Mô tả"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={5}
              placeholder="Nhập mô tả phim..."
            />

            <div className="flex gap-3 justify-end pt-4">
              <Button variant="secondary" onClick={() => navigate('/admin/movies')}>
                Hủy
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Đang lưu...' : isEditing ? 'Cập nhật phim' : 'Tạo phim mới'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AdminLayout>
  )
}
