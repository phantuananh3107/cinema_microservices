import { useEffect, useState } from 'react'
import { FaArrowLeft, FaSave } from 'react-icons/fa'
import { useNavigate, useParams } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import { roomService } from '../../services/roomApi'

const RoomFormPage = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)

  const [formData, setFormData] = useState({
    room_number: '',
    capacity: '',
    room_type: 'STANDARD',
    status: 'ACTIVE',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const roomTypes = roomService.getRoomTypes()
  const roomStatuses = roomService.getRoomStatuses()

  useEffect(() => {
    if (isEditing) {
      fetchRoom()
    }
  }, [id, isEditing])

  const fetchRoom = async () => {
    try {
      setLoading(true)
      const response = await roomService.getRoomById(id)

      if (response.success) {
        const room = response.data
        setFormData({
          room_number: room.room_number.toString(),
          capacity: room.capacity.toString(),
          room_type: room.room_type,
          status: room.status,
        })
      } else {
        setError('Không thể tải thông tin phòng')
      }
    } catch (err) {
      setError('Có lỗi xảy ra khi tải dữ liệu')
      console.error('Error fetching room:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.room_number || !formData.capacity) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc')
      return
    }

    const roomNumber = parseInt(formData.room_number)
    const capacity = parseInt(formData.capacity)

    if (roomNumber <= 0) {
      setError('Số phòng phải lớn hơn 0')
      return
    }

    if (capacity <= 0) {
      setError('Sức chứa phải lớn hơn 0')
      return
    }

    try {
      setLoading(true)
      setError('')

      const requestData = {
        room_number: roomNumber,
        capacity: capacity,
        room_type: formData.room_type,
      }

      if (isEditing) {
        requestData.status = formData.status
        await roomService.updateRoom(id, requestData)
      } else {
        await roomService.createRoom(requestData)
      }

      navigate('/admin/rooms')
    } catch (err) {
      if (err.response?.data?.message?.includes('already exists')) {
        setError('Số phòng này đã tồn tại')
      } else {
        setError(isEditing ? 'Có lỗi xảy ra khi cập nhật phòng' : 'Có lỗi xảy ra khi tạo phòng')
      }
      console.error('Error saving room:', err)
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
            onClick={() => navigate('/admin/rooms')}
            className="text-gray-600 hover:text-gray-900"
          >
            <FaArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEditing ? 'Chỉnh sửa phòng chiếu' : 'Thêm phòng chiếu mới'}
            </h1>
            <p className="text-gray-600">
              {isEditing
                ? 'Cập nhật thông tin phòng chiếu'
                : 'Điền thông tin để tạo phòng chiếu mới'}
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
              {/* Room Number */}
              <div>
                <label
                  htmlFor="room_number"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Số phòng <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="room_number"
                  name="room_number"
                  value={formData.room_number}
                  onChange={handleChange}
                  min="1"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nhập số phòng"
                />
              </div>

              {/* Capacity */}
              <div>
                <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-2">
                  Sức chứa <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="capacity"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleChange}
                  min="1"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nhập sức chứa"
                />
              </div>

              {/* Room Type */}
              <div>
                <label htmlFor="room_type" className="block text-sm font-medium text-gray-700 mb-2">
                  Loại phòng <span className="text-red-500">*</span>
                </label>
                <select
                  id="room_type"
                  name="room_type"
                  value={formData.room_type}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {roomTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status (only for editing) */}
              {isEditing && (
                <div>
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
                    {roomStatuses.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-4 pt-6 border-t">
              <button
                type="button"
                onClick={() => navigate('/admin/rooms')}
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

export default RoomFormPage
