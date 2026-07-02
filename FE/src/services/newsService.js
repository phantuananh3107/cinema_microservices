import axios from 'axios'

const API_URL = process.env.REACT_APP_MOVIE_API_URL || 'http://localhost:8000/api/v1'

const newsApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add request interceptor to include auth token if available
newsApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// News Service API calls
export const newsService = {
  // Get news summaries with pagination
  getNewsSummaries: async (category = 'all', page = 1, pageSize = 10) => {
    try {
      const response = await newsApi.get('/news/summaries', {
        params: {
          category,
          page,
          page_size: pageSize,
        },
      })
      return response.data
    } catch (error) {
      console.error('Error fetching news summaries:', error)
      throw error
    }
  },

  // Get single news summary by ID
  getNewsSummaryById: async (id) => {
    try {
      const response = await newsApi.get(`/news/summaries/${id}`)
      return response.data
    } catch (error) {
      console.error('Error fetching news summary:', error)
      throw error
    }
  },

  // Admin methods

  // Get all news summaries (including inactive)
  getAllNewsSummaries: async (category = 'all', page = 1, pageSize = 12) => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await newsApi.get('/news/admin/summaries', {
        params: { category, page, page_size: pageSize },
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.data
    } catch (error) {
      console.error('Error fetching all news summaries:', error)
      throw error
    }
  },

  // Update news summary
  updateNewsSummary: async (id, title, summary) => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await newsApi.put(
        `/news/admin/summaries/${id}`,
        { title, summary },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      return response.data
    } catch (error) {
      console.error('Error updating news:', error)
      throw error
    }
  },

  // Toggle news active status
  toggleNewsActive: async (id, isActive) => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await newsApi.put(
        `/news/admin/summaries/${id}/active`,
        { is_active: isActive },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      return response.data
    } catch (error) {
      console.error('Error toggling news status:', error)
      throw error
    }
  },
}

export default newsService
