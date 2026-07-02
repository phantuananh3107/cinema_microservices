import { useEffect, useState } from 'react'
import { FaArrowLeft, FaSave } from 'react-icons/fa'
import { useNavigate, useParams } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import { roomService } from '../../services/roomApi'
import { seatService } from '../../services/seatApi'

const SeatFormPage = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)

  const [formData, setFormData] = useState({
    room_id: '',
    seat_number: '',
    row_number: '',
    seat_type: 'REGULAR',
    status: 'AVAILABLE',
  })
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const seatTypes = seatService.getSeatTypes()
  const seatStatuses = seatService.getSeatStatuses()

  useEffect(() => {
    fetchRooms()
    if (isEditing) {
      fetchSeat()
    }
  }, [id, isEditing])

  const fetchRooms = async () => {
    try {
      const response = await roomService.getRooms(1, 100)
      if (response.success) {
        setRooms(response.data.data || [])
      }
    } catch (err) {
      console.error('Error fetching rooms:', err)
    }
  }

  const fetchSeat = async () => {
    try {
      setLoading(true)
      const response = await seatService.getSeatById(id)

      if (response.success) {
        const seat = response.data
        setFormData({
          room_id: seat.room_id,
          seat_number: seat.seat_number,
          row_number: seat.row_number,
          seat_type: seat.seat_type,
          status: seat.status,
        })
      } else {
        setError('Không thể tải thông tin ghế')
      }
    } catch (err) {
      setError('Có lỗi xảy ra khi tải dữ liệu')
      console.error('Error fetching seat:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.room_id || !formData.seat_number || !formData.row_number) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc')
      return
    }

    try {
      setLoading(true)
      setError('')

      const requestData = {
        room_id: formData.room_id,
        seat_number: formData.seat_number,
        row_number: formData.row_number,
        seat_type: formData.seat_type,
      }

      if (isEditing) {
        requestData.status = formData.status
        await seatService.updateSeat(id, requestData)
      } else {
        await seatService.createSeat(requestData)
      }

      navigate('/admin/seats')
    } catch (err) {
      if (err.response?.data?.message?.includes('already exists')) {
        setError('Vị trí ghế này đã tồn tại trong phòng')
      } else {
        setError(isEditing ? 'Có lỗi xảy ra khi cập nhật ghế' : 'Có lỗi xảy ra khi tạo ghế')
      }
      console.error('Error saving seat:', err)
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

  if (loading && isEditing) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/seats')}
            className="text-gray-600 hover:text-gray-900"
          >
            <FaArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEditing ? 'Chỉnh sửa ghế ngồi' : 'Thêm ghế ngồi mới'}
            </h1>
            <p className="text-gray-600">
              {isEditing ? 'Cập nhật thông tin ghế ngồi' : 'Điền thông tin để tạo ghế ngồi mới'}
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Room */}
              <div>
                <label htmlFor="room_id" className="block text-sm font-medium text-gray-700 mb-2">
                  Phòng chiếu <span className="text-red-500">*</span>
                </label>
                <select
                  id="room_id"
                  name="room_id"
                  value={formData.room_id}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Chọn phòng</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      Phòng {room.room_number} ({room.room_type.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Row Number */}
              <div>
                <label
                  htmlFor="row_number"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Hàng ghế <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="row_number"
                  name="row_number"
                  value={formData.row_number}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="VD: A, B, C..."
                />
              </div>

              {/* Seat Number */}
              <div>
                <label
                  htmlFor="seat_number"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Số ghế <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="seat_number"
                  name="seat_number"
                  value={formData.seat_number}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="VD: 01, 02, 03..."
                />
              </div>

              {/* Seat Type */}
              <div>
                <label htmlFor="seat_type" className="block text-sm font-medium text-gray-700 mb-2">
                  Loại ghế <span className="text-red-500">*</span>
                </label>
                <select
                  id="seat_type"
                  name="seat_type"
                  value={formData.seat_type}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {seatTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status (only for editing) */}
              {isEditing && (
                <div className="md:col-span-2">
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                    Trạng thái
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {seatStatuses.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Preview */}
            {formData.room_id && formData.row_number && formData.seat_number && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Xem trước:</h3>
                <div className="text-lg font-medium text-gray-900">
                  Ghế {formData.row_number}
                  {formData.seat_number} -{' '}
                  {rooms.find((r) => r.id === formData.room_id)?.room_number
                    ? `Phòng ${rooms.find((r) => r.id === formData.room_id).room_number}`
                    : 'Phòng chưa chọn'}
                </div>
                <div className="text-sm text-gray-600">
                  Loại: {seatTypes.find((t) => t.value === formData.seat_type)?.label}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-4 pt-6 border-t">
              <button
                type="button"
                onClick={() => navigate('/admin/seats')}
                className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <FaSave />
                )}
                {isEditing ? 'Cập nhật' : 'Tạo mới'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  )
}

export default SeatFormPage
