import axios from 'axios'

const API_URL = process.env.REACT_APP_MOVIE_API_URL || 'http://localhost:8000/api/v1'

const seatApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

seatApi.interceptors.request.use(
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

export const seatService = {
  getSeats: async (
    page = 1,
    size = 10,
    search = '',
    roomId = '',
    seatType = '',
    status = '',
    rowNumber = '',
  ) => {
    let url = `/seats?page=${page}&size=${size}`
    if (search) {
      url += `&search=${encodeURIComponent(search)}`
    }
    if (roomId) {
      url += `&room_id=${roomId}`
    }
    if (seatType) {
      url += `&seat_type=${seatType}`
    }
    if (status) {
      url += `&status=${status}`
    }
    if (rowNumber) {
      url += `&row_number=${rowNumber}`
    }
    const response = await seatApi.get(url)
    return response.data
  },

  getSeatById: async (id) => {
    const response = await seatApi.get(`/seats/${id}`)
    return response.data
  },

  getSeatsByRoom: async (roomId) => {
    const response = await seatApi.get(`/seats?room_id=${roomId}&size=500`)
    return response.data
  },

  createSeat: async (seatData) => {
    const response = await seatApi.post('/seats', seatData)
    return response.data
  },

  updateSeat: async (id, seatData) => {
    const response = await seatApi.put(`/seats/${id}`, seatData)
    return response.data
  },

  deleteSeat: async (id) => {
    const response = await seatApi.delete(`/seats/${id}`)
    return response.data
  },

  updateSeatStatus: async (id, status) => {
    const response = await seatApi.patch(`/seats/${id}/status`, { status })
    return response.data
  },

  // Seat types and statuses for form options
  getSeatTypes: () => [
    { value: 'REGULAR', label: 'Thường' },
    { value: 'VIP', label: 'VIP' },
    { value: 'COUPLE', label: 'Đôi' },
  ],

  getSeatStatuses: () => [
    { value: 'AVAILABLE', label: 'Có sẵn' },
    { value: 'OCCUPIED', label: 'Đã đặt' },
    { value: 'MAINTENANCE', label: 'Bảo trì' },
    { value: 'BLOCKED', label: 'Bị khóa' },
  ],
}

export default seatService
