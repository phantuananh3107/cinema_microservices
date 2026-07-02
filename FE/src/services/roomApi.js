import axios from 'axios'

const API_URL = process.env.REACT_APP_MOVIE_API_URL || 'http://localhost:8000/api/v1'

const roomApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

roomApi.interceptors.request.use(
  (config) => {
    const isAdminPage = window.location.pathname.startsWith('/admin')
    const authToken = isAdminPage
      ? localStorage.getItem('adminToken')
      : localStorage.getItem('token')

    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

export const roomService = {
  getRooms: async (page = 1, size = 10, search = '', roomType = '', status = '') => {
    let url = `/rooms?page=${page}&size=${size}`
    if (search) {
      url += `&search=${encodeURIComponent(search)}`
    }
    if (roomType) {
      url += `&room_type=${roomType}`
    }
    if (status) {
      url += `&status=${status}`
    }
    const response = await roomApi.get(url)
    return response.data
  },

  getRoomById: async (id) => {
    const response = await roomApi.get(`/rooms/${id}`)
    return response.data
  },

  createRoom: async (roomData) => {
    const response = await roomApi.post('/rooms', roomData)
    return response.data
  },

  updateRoom: async (id, roomData) => {
    const response = await roomApi.put(`/rooms/${id}`, roomData)
    return response.data
  },

  deleteRoom: async (id) => {
    const response = await roomApi.delete(`/rooms/${id}`)
    return response.data
  },

  updateRoomStatus: async (id, status) => {
    const response = await roomApi.patch(`/rooms/${id}/status`, { status })
    return response.data
  },

  // Room types and statuses for form options
  getRoomTypes: () => [
    { value: 'STANDARD', label: 'Standard' },
    { value: 'VIP', label: 'VIP' },
    { value: 'IMAX', label: 'IMAX' },
  ],

  getRoomStatuses: () => [
    { value: 'ACTIVE', label: 'Hoạt động' },
    { value: 'INACTIVE', label: 'Không hoạt động' },
    { value: 'MAINTENANCE', label: 'Bảo trì' },
  ],
}

export default roomService
