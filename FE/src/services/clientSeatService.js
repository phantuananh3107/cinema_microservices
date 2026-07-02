import axios from 'axios'

const API_URL = process.env.REACT_APP_MOVIE_API_URL || 'http://localhost:8000/api/v1'

const clientSeatApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

clientSeatApi.interceptors.request.use(
  (config) => {
    const isAdminPage = window.location.pathname.startsWith('/admin')
    const authToken = isAdminPage ?
      localStorage.getItem('adminToken') :
      localStorage.getItem('token')

    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

export const clientSeatService = {
  getSeatsByRoom: async (roomId) => {
    try {
      const response = await clientSeatApi.get(`/seats?room_id=${roomId}&size=500`)
      return response.data
    } catch (error) {
      throw error
    }
  },

  getLockedSeats: async (showtimeId) => {
    try {
      const response = await clientSeatApi.get(`/seats/locked?showtime_id=${showtimeId}`)
      return response.data
    } catch (error) {
      throw error
    }
  },

  getSeatTypeMultipliers: () => [{
      value: 'REGULAR',
      label: 'Thường',
      multiplier: 1.0
    },
    {
      value: 'VIP',
      label: 'VIP',
      multiplier: 1.5
    },
    {
      value: 'COUPLE',
      label: 'Đôi',
      multiplier: 2.5
    },
  ],

  calculateSeatPrice: (seatType, basePrice) => {
    const multipliers = clientSeatService.getSeatTypeMultipliers()
    const typeInfo = multipliers.find(t => t.value === seatType)
    const multiplier = typeInfo ? typeInfo.multiplier : 1.0
    return Math.round(basePrice * multiplier)
  },

  getSeatTypes: (basePrice = 50000) => [{
      value: 'REGULAR',
      label: 'Thường',
      price: Math.round(basePrice)
    },
    {
      value: 'VIP',
      label: 'VIP',
      price: Math.round(basePrice * 1.5)
    },
    {
      value: 'COUPLE',
      label: 'Đôi',
      price: Math.round(basePrice * 2.5)
    },
  ],

  getSeatStatuses: () => [{
      value: 'AVAILABLE',
      label: 'Có sẵn'
    },
    {
      value: 'OCCUPIED',
      label: 'Đã đặt'
    },
    {
      value: 'MAINTENANCE',
      label: 'Bảo trì'
    },
    {
      value: 'BLOCKED',
      label: 'Bị khóa'
    },
  ],
}

export default clientSeatService