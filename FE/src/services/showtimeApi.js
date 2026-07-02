import axios from 'axios'

const API_URL = process.env.REACT_APP_MOVIE_API_URL || 'http://localhost:8000/api/v1'

const showtimeApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

showtimeApi.interceptors.request.use(
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

export const showtimeService = {
  getShowtimes: async (
    page = 1,
    size = 10,
    search = '',
    movieId = '',
    roomId = '',
    format = '',
    status = '',
    dateFrom = '',
    dateTo = '',
    excludeEnded = false,
  ) => {
    let url = `/showtimes?page=${page}&size=${size}`
    if (search) {
      url += `&search=${encodeURIComponent(search)}`
    }
    if (movieId) {
      url += `&movie_id=${movieId}`
    }
    if (roomId) {
      url += `&room_id=${roomId}`
    }
    if (format) {
      url += `&format=${format}`
    }
    if (status) {
      url += `&status=${status}`
    }
    if (dateFrom) {
      url += `&date_from=${dateFrom}`
    }
    if (dateTo) {
      url += `&date_to=${dateTo}`
    }
    if (excludeEnded) {
      url += `&exclude_ended=true`
    }
    const response = await showtimeApi.get(url)
    return response.data
  },

  getShowtimeById: async (id) => {
    const response = await showtimeApi.get(`/showtimes/${id}`)
    return response.data
  },

  getShowtimesByMovie: async (movieId, excludeEnded = false) => {
    let url = `/showtimes?movie_id=${movieId}`
    if (excludeEnded) {
      url += `&exclude_ended=true`
    }
    const response = await showtimeApi.get(url)
    return response.data
  },

  createShowtime: async (showtimeData) => {
    const response = await showtimeApi.post('/showtimes', showtimeData)
    return response.data
  },

  updateShowtime: async (id, showtimeData) => {
    const response = await showtimeApi.put(`/showtimes/${id}`, showtimeData)
    return response.data
  },

  deleteShowtime: async (id) => {
    const response = await showtimeApi.delete(`/showtimes/${id}`)
    return response.data
  },

  updateShowtimeStatus: async (id, status) => {
    const response = await showtimeApi.patch(`/showtimes/${id}/status`, { status })
    return response.data
  },

  getShowtimeFormats: () => [
    { value: '2D', label: '2D' },
    { value: '3D', label: '3D' },
    { value: 'IMAX', label: 'IMAX' },
  ],

  getShowtimeStatuses: () => [
    { value: 'SCHEDULED', label: 'Đã lên lịch' },
    { value: 'ONGOING', label: 'Đang chiếu' },
    { value: 'COMPLETED', label: 'Hoàn thành' },
    { value: 'CANCELED', label: 'Đã hủy' },
  ],
}

export default showtimeService
