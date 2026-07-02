import { FaTimes, FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCalendar, FaVenusMars } from 'react-icons/fa'

const StaffDetailDrawer = ({ staff, isOpen, onClose }) => {
  if (!isOpen || !staff) return null

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800'
      case 'manager_staff':
        return 'bg-blue-100 text-blue-800'
      case 'ticket_staff':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getGenderLabel = (gender) => {
    switch (gender) {
      case 'male':
        return 'Nam'
      case 'female':
        return 'Nữ'
      case 'other':
        return 'Khác'
      default:
        return '-'
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 transition-opacity z-40 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      ></div>

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full md:w-[600px] bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Chi tiết nhân viên</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Đóng"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto h-[calc(100%-80px)]">
          {/* Avatar */}
          <div className="flex justify-center mb-6">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <FaUser className="text-white text-4xl" />
            </div>
          </div>

          {/* Name and Role */}
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{staff.name}</h3>
            <span
              className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getRoleBadgeColor(
                staff.role_id
              )}`}
            >
              {staff.role?.name || staff.role_id}
            </span>
          </div>

          {/* Information */}
          <div className="space-y-4">
            {/* Email */}
            <div className="flex items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FaEnvelope className="text-blue-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-500">Email</p>
                <p className="text-base text-gray-900 break-all">{staff.email || '-'}</p>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <FaPhone className="text-green-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-500">Số điện thoại</p>
                <p className="text-base text-gray-900">{staff.phone_number || '-'}</p>
              </div>
            </div>

            {/* Gender */}
            <div className="flex items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                <FaVenusMars className="text-pink-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-500">Giới tính</p>
                <p className="text-base text-gray-900">{getGenderLabel(staff.gender)}</p>
              </div>
            </div>

            {/* Date of Birth */}
            <div className="flex items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <FaCalendar className="text-purple-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-500">Ngày sinh</p>
                <p className="text-base text-gray-900">{formatDate(staff.dob)}</p>
              </div>
            </div>

            {/* Address */}
            <div className="flex items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <FaMapMarkerAlt className="text-orange-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-500">Địa chỉ</p>
                <p className="text-base text-gray-900">{staff.address || '-'}</p>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 my-6"></div>

            {/* Additional Info */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Ngày tạo</span>
                <span className="text-sm text-gray-900">{formatDate(staff.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Cập nhật lần cuối</span>
                <span className="text-sm text-gray-900">{formatDate(staff.updated_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default StaffDetailDrawer
