import apiClient from './apiClient'

const analyticsService = {
  getRevenueByTime: async (startDate, endDate, limit = 100) => {
    const adjustedEndDate = new Date(endDate)
    adjustedEndDate.setDate(adjustedEndDate.getDate() + 1)
    const params = {
      start_date: startDate,
      end_date: adjustedEndDate.toISOString().split('T')[0],
      limit,
    }

    const response = await apiClient.get('/analytics/revenue/time', { params })
    return response.data
  },

  getRevenueByMovie: async (startDate, endDate, limit = 50) => {
    const params = {
      start_date: startDate,
      end_date: endDate,
      limit,
    }

    const response = await apiClient.get('/analytics/revenue/by-movie', { params })
    return response.data
  },

  getRevenueByGenre: async (startDate, endDate) => {
    const params = {
      start_date: startDate,
      end_date: endDate,
    }

    const response = await apiClient.get('/analytics/revenue/by-genre', { params })
    return response.data
  },

  getTotalRevenue: async (startDate, endDate) => {
    const params = {
      start_date: startDate,
      end_date: endDate,
    }

    const response = await apiClient.get('/analytics/revenue/total', { params })
    return response.data
  },

  getRevenueByShowtime: async (startDate, endDate, movieId = null, limit = 100) => {
    const params = {
      start_date: startDate,
      end_date: endDate,
      limit,
    }

    if (movieId) {
      params.movie_id = movieId
    }

    const response = await apiClient.get('/analytics/revenue/by-showtime', { params })
    return response.data
  },
}

export default analyticsService
