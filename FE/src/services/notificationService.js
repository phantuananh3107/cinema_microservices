import axios from 'axios'

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'

class NotificationService {
  async getNotifications(userId, page = 1, size = 10, status = '') {
    const token = localStorage.getItem('token')
    const params = new URLSearchParams({ page: page.toString(), size: size.toString() })
    if (status) {
      params.append('status', status)
    }

    const response = await axios.get(`${API_URL}/notifications/${userId}?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  }

  async getUnreadCount(userId) {
    const token = localStorage.getItem('token')
    const response = await axios.get(`${API_URL}/notifications/${userId}/unread-count`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  }

  async markNotificationAsRead(userId, notificationId, status = 'READ') {
    const token = localStorage.getItem('token')
    const response = await axios.put(
      `${API_URL}/notifications/${userId}/${notificationId}/status`,
      { status },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
    return response.data
  }

  async deleteNotification(userId, notificationId) {
    const token = localStorage.getItem('token')
    const response = await axios.delete(`${API_URL}/notifications/${userId}/${notificationId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  }
}

export default new NotificationService()

