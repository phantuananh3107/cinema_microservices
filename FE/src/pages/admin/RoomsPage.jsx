import { useEffect, useState } from 'react'
import { FaPlus, FaSearch } from 'react-icons/fa'
import { Link, useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import { roomService } from '../../services/roomApi'
import DataTable from '../../components/shared/DataTable'
import { formatDate } from '../../utils/formatters'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import LoadingSpinner from '../../components/common/LoadingSpinner'

const RoomsPage = () => {
  const navigate = useNavigate()
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [selectedRoomType, setSelectedRoomType] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')

  const roomTypes = roomService.getRoomTypes()
  const roomStatuses = roomService.getRoomStatuses()

  const fetchRooms = async () => {
    try {
      setLoading(true)
      const response = await roomService.getRooms(
        currentPage,
        10,
        search,
        selectedRoomType,
        selectedStatus,
      )

      if (response.success) {
        setRooms(response.data.data || [])
        setTotalPages(response.data.paging?.total_pages || 1)
      } else {
        setError('Không thể tải danh sách phòng')
      }
    } catch (err) {
      setError('Có lỗi xảy ra khi tải dữ liệu')
      console.error('Error fetching rooms:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRooms()
  }, [currentPage, search, selectedRoomType, selectedStatus])

  const handleSearch = (e) => {
    setSearch(e.target.value)
    setCurrentPage(1)
  }

  const handleDelete = async (room) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa phòng này?')) {
      return
    }

    try {
      await roomService.deleteRoom(room.id)
      fetchRooms()
    } catch (err) {
      alert('Có lỗi xảy ra khi xóa phòng')
      console.error('Error deleting room:', err)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-500 text-white'
      case 'INACTIVE':
        return 'bg-red-500 text-white'
      case 'MAINTENANCE':
        return 'bg-yellow-500 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  const getRoomTypeLabel = (type) => {
    const roomType = roomTypes.find((rt) => rt.value === type)
    return roomType ? roomType.label : type
  }

  const getStatusLabel = (status) => {
    const roomStatus = roomStatuses.find((s) => s.value === status)
    return roomStatus ? roomStatus.label : status
  }

  const handleEdit = (room) => {
    navigate(`/admin/rooms/${room.id}/edit`)
  }

  const columns = [
    {
      label: 'Phòng',
      render: (room) => (
        <div className="text-sm font-medium text-gray-900">
          Phòng {room.room_number}
        </div>
      )
    },
    {
      label: 'Loại phòng',
      render: (room) => (
        <div className="text-sm text-gray-900">
          {getRoomTypeLabel(room.room_type)}
        </div>
      )
    },
    {
      label: 'Sức chứa',
      render: (room) => (
        <div className="text-sm text-gray-900">{room.capacity} ghế</div>
      )
    },
    {
      label: 'Trạng thái',
      render: (room) => (
        <span className={`text-xs px-3 py-1 rounded-full font-medium ${getStatusColor(room.status)}`}>
          {getStatusLabel(room.status)}
        </span>
      )
    },
    {
      label: 'Ngày tạo',
      render: (room) => (
        <span className="text-sm text-gray-500">{formatDate(room.created_at)}</span>
      )
    }
  ]

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Card>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Quản lý Phòng chiếu</h1>
              <p className="text-gray-600">Quản lý thông tin các phòng chiếu trong rạp</p>
            </div>
            <Link to="/admin/rooms/new">
              <Button>
                <FaPlus />
                <span>Thêm phòng mới</span>
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
                placeholder="Tìm kiếm phòng..."
                value={search}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none"
              />
            </div>

            <select
              value={selectedRoomType}
              onChange={(e) => {
                setSelectedRoomType(e.target.value)
                setCurrentPage(1)
              }}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none"
            >
              <option value="">Tất cả loại phòng</option>
              {roomTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value)
                setCurrentPage(1)
              }}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none"
            >
              <option value="">Tất cả trạng thái</option>
              {roomStatuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </Card>

        {loading ? (
          <LoadingSpinner size="lg" text="Đang tải danh sách phòng chiếu..." />
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
            <DataTable
              columns={columns}
              data={rooms}
              onEdit={handleEdit}
              onDelete={handleDelete}
              actions={['edit', 'delete']}
              emptyMessage="Không có phòng nào"
              loading={loading}
            />

            {totalPages > 1 && (
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

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
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
                    ))}

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
            )}
          </>
        )}
      </div>
    </AdminLayout>
  )
}

export default RoomsPage
