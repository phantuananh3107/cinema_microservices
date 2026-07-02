import { useEffect, useState } from 'react'
import { FaArrowLeft, FaSave } from 'react-icons/fa'
import { useNavigate, useParams } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import { userService } from '../../services/userService'

const StaffFormPage = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone_number: '',
    address: '',
    role: 'ticket_staff',
    gender: '',
    dob: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  const staffRoles = [
    { value: 'ticket_staff', label: 'Nhân viên bán vé' },
    { value: 'manager_staff', label: 'Quản lý rạp' },
  ]

  const genders = [
    { value: '', label: 'Chọn giới tính' },
    { value: 'male', label: 'Nam' },
    { value: 'female', label: 'Nữ' },
    { value: 'other', label: 'Khác' },
  ]

  useEffect(() => {
    if (isEditing) {
      fetchUser()
    }
  }, [id, isEditing])

  const fetchUser = async () => {
    try {
      setLoading(true)
      const response = await userService.getUserById(id)

      if (response.success && response.data) {
        const user = response.data
        setFormData({
          name: user.name || '',
          email: user.email || '',
          phone_number: user.phone_number || '',
          address: user.address || '',
          role: user.role || 'ticket_staff',
          gender: user.gender || '',
          dob: user.dob || '',
        })
      } else {
        setError('Không thể tải thông tin người dùng')
      }
    } catch (err) {
      setError('Có lỗi xảy ra khi tải dữ liệu')
      console.error('Error fetching user:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name || !formData.email) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc')
      return
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Email không hợp lệ')
      return
    }

    try {
      setLoading(true)
      setError('')

      if (isEditing) {
        // Update existing user
        const updateData = {
          name: formData.name,
          phone_number: formData.phone_number,
          address: formData.address,
          gender: formData.gender,
          dob: formData.dob,
        }

        await userService.updateUser(id, updateData)
      } else {
        const createData = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          address: formData.address,
          phone_number: formData.phone_number,
          gender: formData.gender,
          dob: formData.dob,
        }

        await userService.createStaff(createData)
      }

      navigate('/admin/staff')
    } catch (err) {
      if (err.response?.data?.message) {
        setError(err.response.data.message)
      } else if (err.response?.data?.error) {
        setError(err.response.data.error)
      } else {
        setError(isEditing ? 'Có lỗi xảy ra khi cập nhật người dùng' : 'Có lỗi xảy ra khi tạo nhân viên')
      }
      console.error('Error saving user:', err)
    } finally {
      setLoading(false)
      setConfirmOpen(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    setError('')
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
            onClick={() => navigate('/admin/staff')}
            className="text-gray-600 hover:text-gray-900"
          >
            <FaArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEditing ? 'Chỉnh sửa thông tin người dùng' : 'Thêm nhân viên mới'}
            </h1>
            <p className="text-gray-600">
              {isEditing
                ? 'Cập nhật thông tin người dùng trong hệ thống'
                : 'Điền thông tin để tạo tài khoản nhân viên mới'}
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
              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nguyễn Văn A"
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={isEditing} // Cannot change email when editing
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  placeholder="email@example.com"
                />
              </div>

              {/* Role (only for create) */}
              {!isEditing && (
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                    Vai trò <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {staffRoles.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Phone Number */}
              <div>
                <label
                  htmlFor="phone_number"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  id="phone_number"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0123456789"
                />
              </div>

              {/* Gender */}
              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                  Giới tính
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {genders.map((gender) => (
                    <option key={gender.value} value={gender.value}>
                      {gender.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date of Birth */}
              <div>
                <label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-2">
                  Ngày sinh
                </label>
                <input
                  type="date"
                  id="dob"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Address */}
              <div className="md:col-span-2">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                  Địa chỉ
                </label>
                <textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nhập địa chỉ"
                ></textarea>
              </div>
            </div>

            {/* Preview (for create mode) */}
            {!isEditing && formData.name && formData.email && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Xem trước:</h3>
                <div className="text-sm text-gray-900">
                  <strong>{formData.name}</strong> - {formData.email}
                </div>
                <div className="text-sm text-gray-600">
                  Vai trò: {staffRoles.find((r) => r.value === formData.role)?.label}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-4 pt-6 border-t">
              <button
                type="button"
                onClick={() => navigate('/admin/staff')}
                className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
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

      {/* Confirmation Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">
              {isEditing ? 'Xác nhận cập nhật' : 'Xác nhận tạo tài khoản nhân viên'}
            </h2>
            <p className="text-gray-700 mb-6">
              {isEditing
                ? `Bạn có chắc chắn muốn cập nhật thông tin người dùng "${formData.name}"?`
                : `Bạn có chắc chắn muốn tạo tài khoản nhân viên với email ${formData.email}?`}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default StaffFormPage
