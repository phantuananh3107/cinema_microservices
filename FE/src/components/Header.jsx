import { useState, useEffect, useMemo } from 'react'
import { FaBars, FaBell, FaMapMarkerAlt, FaSearch, FaTimes, FaUser } from 'react-icons/fa'
import { Link } from 'react-router-dom'
import NotificationPanel from './NotificationPanel'
import notificationService from '../services/notificationService'
import websocketService from '../services/websocketService'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const token = localStorage.getItem('token')

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}')
    } catch {
      return {}
    }
  }, [token])

  const loadUnreadCount = async () => {
    if (!user.id) return
    try {
      const response = await notificationService.getUnreadCount(user.id)
      setUnreadCount(response.data?.count || 0)
    } catch (error) {
      console.error('Failed to load unread count:', error)
    }
  }

  useEffect(() => {
    if (token && user.id) {
      loadUnreadCount()

      const handleNotification = () => {
        loadUnreadCount()
      }

      websocketService.onNotification(handleNotification)

      return () => {
        websocketService.removeNotificationListener(handleNotification)
      }
    }
  }, [token])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.reload()
  }

  return (
    <header className="bg-black/95 backdrop-blur-sm shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-12 h-12 bg-gradient-to-r from-red-600 to-red-800 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">HQ</span>
            </div>
            <span className="text-white font-bold text-xl hidden sm:block">Cinema</span>
          </Link>

          {/* Navigation - Desktop */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              to="/"
              className="text-gray-300 hover:text-red-400 transition-colors duration-300 font-medium"
            >
              Trang chủ
            </Link>
            <Link
              to="/movies"
              className="text-gray-300 hover:text-red-400 transition-colors duration-300 font-medium"
            >
              Phim
            </Link>
            <Link
              to="/showtimes"
              className="text-gray-300 hover:text-red-400 transition-colors duration-300 font-medium"
            >
              Lịch chiếu
            </Link>
            <Link
              to="/news"
              className="text-gray-300 hover:text-red-400 transition-colors duration-300 font-medium"
            >
              Tin tức
            </Link>
          </nav>

          {/* Right Side - Search, Location, User */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <button
              type="button"
              className="text-gray-300 hover:text-red-400 transition-colors duration-300 hidden sm:block"
            >
              <FaSearch className="w-5 h-5" />
            </button>

            {/* Location */}
            <div className="hidden lg:flex items-center space-x-1 text-gray-300 hover:text-red-400 transition-colors duration-300 cursor-pointer">
              <FaMapMarkerAlt className="w-4 h-4" />
              <span className="text-sm">Hà Nội</span>
            </div>

            {/* Notification Bell - Only show when logged in */}
            {token && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                  className="relative text-gray-300 hover:text-red-400 transition-colors duration-300 p-2"
                >
                  <FaBell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
                <NotificationPanel
                  userId={user.id}
                  isOpen={isNotificationOpen}
                  onClose={() => setIsNotificationOpen(false)}
                />
              </div>
            )}

            {/* User Menu */}
            {token ? (
              <div className="relative group">
                <button
                  type="button"
                  className="flex items-center space-x-2 text-gray-300 hover:text-red-400 transition-colors duration-300"
                >
                  <FaUser className="w-5 h-5" />
                  <span className="hidden sm:block">{user.name || 'User'}</span>
                </button>

                {/* Dropdown */}
                <div className="absolute right-0 mt-2 w-48 bg-black/90 backdrop-blur-sm border border-red-600/30 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">
                  <div className="py-2">
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-gray-300 hover:text-red-400 hover:bg-red-900/20 transition-colors duration-300"
                    >
                      Thông tin cá nhân
                    </Link>
                    <Link
                      to="/booking-history"
                      className="block px-4 py-2 text-gray-300 hover:text-red-400 hover:bg-red-900/20 transition-colors duration-300"
                    >
                      Lịch sử đặt vé
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-gray-300 hover:text-red-400 hover:bg-red-900/20 transition-colors duration-300"
                    >
                      Đăng xuất
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="bg-transparent border border-red-600 text-red-400 hover:bg-red-600 hover:text-white px-4 py-2 rounded-lg transition-all duration-300 text-sm font-medium"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white px-4 py-2 rounded-lg transition-all duration-300 text-sm font-medium"
                >
                  Đăng ký
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden text-gray-300 hover:text-red-400 transition-colors duration-300"
            >
              {isMenuOpen ? <FaTimes className="w-6 h-6" /> : <FaBars className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-800">
            <nav className="flex flex-col space-y-2">
              <Link
                to="/"
                className="text-gray-300 hover:text-red-400 transition-colors duration-300 py-2 font-medium"
              >
                Trang chủ
              </Link>
              <Link
                to="/movies"
                className="text-gray-300 hover:text-red-400 transition-colors duration-300 py-2 font-medium"
              >
                Phim
              </Link>
              <Link
                to="/showtimes"
                className="text-gray-300 hover:text-red-400 transition-colors duration-300 py-2 font-medium"
              >
                Lịch chiếu
              </Link>
              <Link
                to="/news"
                className="text-gray-300 hover:text-red-400 transition-colors duration-300 py-2 font-medium"
              >
                Tin tức
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
