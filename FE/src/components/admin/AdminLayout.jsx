import { useState, useEffect } from 'react'
import {
  FaBars,
  FaChartBar,
  FaClock,
  FaCouch,
  FaDoorOpen,
  FaFilm,
  FaHome,
  FaMoneyBillWave,
  FaNewspaper,
  FaRobot,
  FaSearch,
  FaShoppingCart,
  FaSignOutAlt,
  FaTimes,
  FaUser,
  FaUserShield,
} from 'react-icons/fa'
import { useLocation, useNavigate } from 'react-router-dom'

export default function AdminLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [adminUser, setAdminUser] = useState(() => 
    JSON.parse(localStorage.getItem('adminUser') || '{}')
  )
  const userPermissions = adminUser?.permissions || []

  // Auto-open/close sidebar based on screen size
  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth >= 1024)
    }

    handleResize()

    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const handleAdminUserUpdate = () => {
      const updatedAdminUser = JSON.parse(localStorage.getItem('adminUser') || '{}')
      setAdminUser(updatedAdminUser)
    }

    window.addEventListener('adminUserUpdated', handleAdminUserUpdate)

    return () => window.removeEventListener('adminUserUpdated', handleAdminUserUpdate)
  }, [])

  const hasPermission = (permissionCode) => {
    if (!permissionCode) return true
    return userPermissions.includes(permissionCode)
  }

  const isItemVisible = (item) => {
    if (!item.permission) return true

    return hasPermission(item.permission)
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUser')
    window.dispatchEvent(new Event('tokenChange'))
    navigate('/admin/login')
  }

  const isActiveRoute = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const navItems = [
    {
      path: '/admin/dashboard',
      label: 'Dashboard',
      icon: FaChartBar,
      permission: 'profile_view',
    },
    {
      path: '/admin/movies',
      label: 'Quản lý phim',
      icon: FaFilm,
      permission: 'movie_manage',
    },
    {
      path: '/admin/news',
      label: 'Tin tức',
      icon: FaNewspaper,
      permission: 'news_manage',
    },
    {
      path: '/admin/rooms',
      label: 'Phòng chiếu',
      icon: FaDoorOpen,
      permission: 'seat_manage',
    },
    {
      path: '/admin/seats',
      label: 'Ghế ngồi',
      icon: FaCouch,
      permission: 'seat_manage',
    },
    {
      path: '/admin/showtimes',
      label: 'Lịch chiếu',
      icon: FaClock,
      permission: 'showtime_manage',
    },
    {
      path: '/admin/box-office',
      label: 'Bán vé tại quầy',
      icon: FaShoppingCart,
      permission: 'ticket_issue',
    },
    {
      path: '/admin/ticket-search',
      label: 'Xuất vé',
      icon: FaSearch,
      permission: 'ticket_view',
    },
    {
      path: '/admin/revenue',
      label: 'Doanh thu',
      icon: FaMoneyBillWave,
      permission: 'report_view',
    },
    {
      path: '/admin/staff',
      label: 'Nhân viên',
      icon: FaUser,
      permission: 'staff_manage',
    },
    {
      path: '/admin/permissions',
      label: 'Phân quyền',
      icon: FaUserShield,
      permission: 'permission_manage',
    },
    {
      path: '/admin/chatbot-documents',
      label: 'Chatbot Documents',
      icon: FaRobot,
      permission: 'news_manage',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50">
      <header className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white shadow-lg sticky top-0 z-50 h-16 border-b border-slate-600/50">
        <div className="px-6 h-full flex items-center">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden p-2 rounded-lg bg-transparent border-none text-white cursor-pointer transition-colors duration-150 hover:bg-white/10 flex items-center justify-center"
              >
                {isSidebarOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-lg flex items-center justify-center shadow-lg">
                  <FaFilm className="text-white text-lg" />
                </div>
                <div>
                  <h1 className="text-xl font-bold m-0">
                    HQ Cinema Admin
                  </h1>
                  <p className="text-xs text-slate-300 m-0">
                    Hệ thống quản lý rạp chiếu phim
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg">
                <FaUser className="text-sm text-blue-300" />
                <span className="text-sm text-white">
                  {adminUser?.name || 'Admin'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-white cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md text-sm font-medium"
              >
                <FaSignOutAlt size={16} />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside
          className={`${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 fixed lg:static z-40 w-64 h-[calc(100vh-4rem)] transition-transform duration-300 bg-white border-r border-gray-200 overflow-y-auto`}
        >
          {isSidebarOpen && (
            <div
              className="lg:hidden fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-30"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          <div className="relative z-40 h-full bg-white">
            <nav className="py-6">
              <div className="mb-6 px-4">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="flex items-center gap-3 w-full px-4 py-3 text-gray-500 bg-transparent border-none rounded-lg cursor-pointer transition-all duration-150 hover:bg-gray-50 hover:text-gray-900 text-sm font-medium"
                >
                  <FaHome size={18} />
                  <span>Về trang chủ</span>
                </button>
              </div>

              <div className="px-4 flex flex-col gap-1">
                {navItems.map((item) => {
                  const IconComponent = item.icon
                  const isActive = isActiveRoute(item.path)

                  // Check if menu item should be visible based on permissions
                  if (!isItemVisible(item)) return null

                  return (
                    <button
                      type="button"
                      key={item.path}
                      onClick={() => {
                        navigate(item.path)
                        setIsSidebarOpen(false)
                      }}
                      className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg border-none cursor-pointer transition-all duration-150 text-sm relative ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-50 to-indigo-50/50 text-blue-700 font-semibold border-l-4 border-blue-600'
                          : 'bg-transparent text-gray-500 font-medium border-l-4 border-transparent hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <IconComponent size={18} />
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </nav>

            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gray-50 border-t border-gray-200">
              <div className="text-center text-xs text-gray-400">
                <p className="m-0">HQ Cinema Admin v1.0</p>
                <p className="mt-1 m-0">© 2025 All rights reserved</p>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-h-[calc(100vh-4rem)] bg-gray-50">
          <div className="p-8">
            <div className="max-w-[1400px] mx-auto">{children}</div>
          </div>
        </main>
      </div>
    </div>
  )
}
