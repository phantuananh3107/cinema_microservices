import axios from 'axios'

const MOVIE_API_URL = process.env.REACT_APP_MOVIE_API_URL || 'http://localhost:8000/api/v1'

const movieApi = axios.create({
  baseURL: MOVIE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

movieApi.interceptors.request.use(
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

export const movieService = {
  getMovies: async (page = 1, size = 10, search = '', status = '') => {
    let url = `/movies?page=${page}&size=${size}`
    if (search) {
      url += `&search=${encodeURIComponent(search)}`
    }
    if (status) {
      url += `&status=${encodeURIComponent(status)}`
    }
    const response = await movieApi.get(url)
    return response.data
  },

  searchMovies: async (query, page = 1, size = 10) => {
    const response = await movieApi.get(
      `/movies?page=${page}&size=${size}&search=${encodeURIComponent(query)}`,
    )
    return response.data
  },

  getMovieById: async (id) => {
    const response = await movieApi.get(`/movies/${id}`)
    return response.data
  },

  createMovie: async (movieData) => {
    const response = await movieApi.post('/movies', movieData)
    return response.data
  },

  updateMovie: async (id, movieData) => {
    const response = await movieApi.put(`/movies/${id}`, movieData)
    return response.data
  },

  deleteMovie: async (id) => {
    const response = await movieApi.delete(`/movies/${id}`)
    return response.data
  },

  updateMovieStatus: async (id, status) => {
    const response = await movieApi.patch(`/movies/${id}/status`, { status })
    return response.data
  },

  getMovieStats: async () => {
    const response = await movieApi.get('/movies/stats')
    return response.data
  },
}

export default movieService
