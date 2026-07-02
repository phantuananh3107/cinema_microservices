import { useEffect, useState, useRef, useCallback } from 'react'
import { FaBell, FaCheck, FaCheckDouble, FaTimes, FaTrash, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import notificationService from '../services/notificationService'
import websocketService from '../services/websocketService'

const NotificationPanel = ({ userId, isOpen, onClose }) => {
  const [notifications, setNotifications] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const panelRef = useRef(null)
  const pageSize = 10

  const loadNotifications = async (pageNum = 1) => {
    if (loading) return

    setLoading(true)
    try {
      const response = await notificationService.getNotifications(userId, pageNum, pageSize, 'sent')
      setNotifications(response.data?.notifications || [])
      setTotalPages(response.data?.page_info?.total_pages || 0)
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUnreadCount = async () => {
    try {
      const response = await notificationService.getUnreadCount(userId)
      setUnreadCount(response.data?.count || 0)
    } catch (error) {
      console.error('Failed to load unread count:', error)
    }
  }

  useEffect(() => {
    if (isOpen && userId) {
      setPage(1)
      loadNotifications(1)
      loadUnreadCount()
    }
  }, [isOpen, userId])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (!userId) return

    const handleNotification = () => {
      loadUnreadCount()
      if (isOpen && page === 1) {
        loadNotifications(1)
      }
    }

    websocketService.onNotification(handleNotification)

    return () => {
      websocketService.removeNotificationListener(handleNotification)
    }
  }, [userId])

  const handleNextPage = () => {
    if (page < totalPages && !loading) {
      const nextPage = page + 1
      setPage(nextPage)
      loadNotifications(nextPage)
    }
  }

  const handlePrevPage = () => {
    if (page > 1 && !loading) {
      const prevPage = page - 1
      setPage(prevPage)
      loadNotifications(prevPage)
    }
  }

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markNotificationAsRead(userId, notificationId, 'READ')
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, status: 'READ' } : n))
      )
      loadUnreadCount()
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter((n) => n.status !== 'READ').map((n) => n.id)
      if (unreadIds.length === 0) return

      await notificationService.markNotificationAsRead(userId, unreadIds, 'READ')
      setNotifications((prev) => prev.map((n) => (n.id === unreadIds ? { ...n, status: 'READ' } : n)))
      loadUnreadCount()
    } catch (error) {
      console.error('Failed to mark notifications as read:', error)
    }
  }

  const getNotificationIcon = (title) => {
    if (title.includes('Booking')) return '🎬'
    if (title.includes('Email')) return '✉️'
    if (title.includes('Password')) return '🔑'
    return '🔔'
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Vừa xong'
    if (minutes < 60) return `${minutes} phút trước`
    if (hours < 24) return `${hours} giờ trước`
    if (days < 7) return `${days} ngày trước`
    return date.toLocaleDateString('vi-VN')
  }

  if (!isOpen) return null

  return (
    <div
      ref={panelRef}
      className="absolute right-0 mt-2 w-96 max-h-[600px] bg-gradient-to-b from-gray-900 to-black border border-red-600/30 rounded-lg shadow-2xl overflow-hidden z-50"
    >
      {/* Header */}
      <div className="sticky top-0 bg-gradient-to-r from-red-600 to-red-800 px-4 py-3 border-b border-red-700/50 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FaBell className="text-white text-lg" />
            <h3 className="text-white font-bold text-lg">Thông báo</h3>
            {unreadCount > 0 && (
              <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-white/80 hover:text-white transition-colors duration-200 text-sm flex items-center space-x-1"
                title="Đánh dấu tất cả đã đọc"
              >
                <FaCheckDouble className="text-sm" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors duration-200"
            >
              <FaTimes className="text-lg" />
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="overflow-y-auto max-h-[500px] custom-scrollbar">
        {notifications.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <FaBell className="text-gray-600 text-5xl mb-4" />
            <p className="text-gray-400 text-sm">Chưa có thông báo nào</p>
          </div>
        )}

        {notifications.map((notification, index) => (
          <div
            key={notification.id || index}
            className={`border-b border-gray-800 hover:bg-gray-800/50 transition-colors duration-200 ${
              notification.status !== 'read' ? 'bg-red-900/10' : ''
            }`}
          >
            <div className="px-4 py-3">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 text-2xl">
                  {getNotificationIcon(notification.title)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-white font-semibold text-sm truncate">
                          {notification.title}
                        </h4>
                        {notification.status !== 'read' && (
                          <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                        )}
                      </div>
                      <p className="text-gray-400 text-xs mt-1 line-clamp-2">
                        {notification.content}
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        {formatTime(notification.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1 ml-2">
                      {notification.status !== 'read' && (
                        <button
                          type="button"
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="text-gray-400 hover:text-green-400 transition-colors duration-200 p-1"
                          title="Đánh dấu đã đọc"
                        >
                          <FaCheck className="text-xs" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(notification.id)}
                        className="text-gray-400 hover:text-red-400 transition-colors duration-200 p-1"
                        title="Xóa"
                      >
                        <FaTrash className="text-xs" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="sticky bottom-0 bg-gradient-to-t from-gray-900 to-gray-900/95 px-4 py-3 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={page === 1 || loading}
              className="flex items-center space-x-1 text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <FaChevronLeft className="text-xs" />
              <span className="text-sm">Trước</span>
            </button>
            <span className="text-gray-400 text-sm">
              Trang {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={handleNextPage}
              disabled={page === totalPages || loading}
              className="flex items-center space-x-1 text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <span className="text-sm">Sau</span>
              <FaChevronRight className="text-xs" />
            </button>
          </div>
        </div>
      )}

      <style jsx="true">{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.3);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(239, 68, 68, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(239, 68, 68, 0.7);
        }
      `}</style>
    </div>
  )
}

export default NotificationPanel

