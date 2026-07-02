import { useEffect, useState } from 'react'
import { FaEdit, FaEye, FaPlus, FaSearch, FaTrash, FaUser } from 'react-icons/fa'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import StaffDetailDrawer from '../../components/admin/StaffDetailDrawer'
import { userService } from '../../services/userService'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import LoadingSpinner from '../../components/common/LoadingSpinner'

const StaffPage = () => {
  const [staffs, setStaffs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState(null)

  const roles = userService.getStaffRoles()

  const fetchStaffs = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await userService.getAllStaffs(currentPage, 10, selectedRole, search)

      if (!response.success) {
        setError('Không thể tải danh sách nhân viên')
        return
      }

      if (!response.data) {
        setStaffs([])
        return
      }

      if (Array.isArray(response.data)) {
        setStaffs(response.data)
        setTotalPages(1)
        return
      }

      if (response.data.data && Array.isArray(response.data.data)) {
        setStaffs(response.data.data)
        setTotalPages(response.data.paging?.total_pages || 1)
        return
      }

      setStaffs([])
    } catch (err) {
      setError('Có lỗi xảy ra khi tải dữ liệu')
      console.error('Error fetching staffs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStaffs()
  }, [currentPage, search, selectedRole])

  const handleSearch = (e) => {
    setSearch(e.target.value)
    setCurrentPage(1)
  }

  const handleViewDetails = (staff) => {
    setSelectedStaff(staff)
    setIsDrawerOpen(true)
  }

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
    setSelectedStaff(null)
  }

  const handleDelete = async (id, userName) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa nhân viên "${userName}"?`)) {
      return
    }

    try {
      await userService.deleteUser(id)
      fetchStaffs()
    } catch (err) {
      alert('Có lỗi xảy ra khi xóa nhân viên')
      console.error('Error deleting user:', err)
    }
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

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Card>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Quản lý Nhân viên</h1>
              <p className="text-gray-600">Quản lý tài khoản nhân viên và admin hệ thống</p>
            </div>
            <Link to="/admin/staff/new">
              <Button>
                <FaPlus />
                <span>Thêm nhân viên mới</span>
              </Button>
            </Link>
          </div>
        </Card>

        <Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên, email..."
                value={search}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none"
              />
            </div>

            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value)
                setCurrentPage(1)
              }}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none"
            >
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>

            <Button
              variant="secondary"
              onClick={() => {
                setSearch('')
                setSelectedRole('')
                setCurrentPage(1)
              }}
            >
              Xóa bộ lọc
            </Button>
          </div>
        </Card>

        {loading ? (
          <LoadingSpinner size="lg" text="Đang tải danh sách nhân viên..." />
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
            <div className="flex items-start">
              <span className="text-red-500 text-xl mr-3">⚠</span>
              <div>
                <h3 className="text-sm font-semibold text-red-800">Lỗi tải dữ liệu</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <Card padding="none">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nhân viên
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vai trò
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Số điện thoại
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngày tạo
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {staffs.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <FaUser className="text-gray-500" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">ID: {user.id.slice(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(user.role.name)}`}
                        >
                          {user.role.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.phone_number || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewDetails(user)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Xem chi tiết"
                          >
                            <FaEye />
                          </button>
                          <Link
                            to={`/admin/staff/${user.id}/edit`}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Chỉnh sửa"
                          >
                            <FaEdit />
                          </Link>
                          {user.role?.name !== 'admin' && (
                            <button
                              onClick={() => handleDelete(user.id, user.name)}
                              className="text-red-600 hover:text-red-900"
                              title="Xóa"
                            >
                              <FaTrash />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {staffs.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">👥</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Chưa có nhân viên nào</h3>
                  <p className="text-gray-500">Hãy thêm nhân viên đầu tiên vào hệ thống</p>
                </div>
              )}
              </div>
            </Card>

            <Card>
              <div className="flex justify-center overflow-x-auto">
                <nav className="flex space-x-2 px-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Trước
                  </button>

                {(() => {
                  const delta = 2
                  const range = []
                  const rangeWithDots = []

                  for (
                    let i = Math.max(2, currentPage - delta);
                    i <= Math.min(totalPages - 1, currentPage + delta);
                    i++
                  ) {
                    range.push(i)
                  }

                  if (currentPage - delta > 2) {
                    rangeWithDots.push(1, '...')
                  } else {
                    rangeWithDots.push(1)
                  }

                  rangeWithDots.push(...range.filter((page) => page !== 1))

                  if (currentPage + delta < totalPages - 1) {
                    rangeWithDots.push('...', totalPages)
                  } else if (totalPages > 1 && !rangeWithDots.includes(totalPages)) {
                    rangeWithDots.push(totalPages)
                  }

                  return rangeWithDots.map((page, index) => {
                    if (page === '...') {
                      return (
                        <span key={`dots-${index}`} className="px-3 py-2 text-sm text-gray-500">
                          ...
                        </span>
                      )
                    }

                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                          currentPage === page
                            ? 'bg-blue-600 text-white font-semibold'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  })
                })()}

                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Sau →
                  </button>
                </nav>
              </div>
            </Card>

            <Card>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-slate-900 mb-2">{staffs.length}</div>
                  <div className="text-sm text-gray-600 uppercase tracking-wide font-medium">
                    Tổng số nhân viên
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {staffs.filter((u) => u.role?.name === 'manager_staff').length}
                  </div>
                  <div className="text-sm text-gray-600 uppercase tracking-wide font-medium">
                    Quản lý rạp
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-indigo-600 mb-2">
                    {staffs.filter((u) => u.role?.name === 'ticket_staff').length}
                  </div>
                  <div className="text-sm text-gray-600 uppercase tracking-wide font-medium">
                    Nhân viên bán vé
                  </div>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Staff Detail Drawer */}
      <StaffDetailDrawer staff={selectedStaff} isOpen={isDrawerOpen} onClose={handleCloseDrawer} />
    </AdminLayout>
  )
}

export default StaffPage
