import axios from 'axios'

const API_URL = process.env.REACT_APP_MOVIE_API_URL || 'http://localhost:8000/api/v1'

const movieApi = axios.create({
  baseURL: API_URL,
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
  (error) => {
    return Promise.reject(error)
  },
)

export const movieService = {
  getAllMovies: async () => {
    try {
      const response = await movieApi.get('/movies')

      return response.data
    } catch (error) {
      console.error('Error fetching movies:', error)
      throw error
    }
  },

  getShowingMovies: async () => {
    try {
      const response = await movieApi.get('/movies?status=SHOWING')
      return response.data
    } catch (error) {
      console.error('Error fetching now showing movies:', error)
      throw error
    }
  },

  getUpcomingMovies: async () => {
    try {
      const response = await movieApi.get('/movies?status=UPCOMING')
      return response.data
    } catch (error) {
      console.error('Error fetching upcoming movies:', error)
      throw error
    }
  },

  getMovieById: async (id) => {
    try {
      const response = await movieApi.get(`/movies/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching movie ${id}:`, error)
      throw error
    }
  },

  getShowtimes: async (movieId = null, roomId = null, excludeEnded = false) => {
    try {
      let url = '/showtimes'
      const params = new URLSearchParams()

      if (movieId) params.append('movie_id', movieId)
      if (roomId) params.append('room_id', roomId)
      if (excludeEnded) params.append('exclude_ended', 'true')

      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await movieApi.get(url)
      return response.data
    } catch (error) {
      console.error('Error fetching showtimes:', error)
      throw error
    }
  },

  getUpcomingShowtimes: async () => {
    try {
      const response = await movieApi.get('/showtimes/upcoming')
      return response.data
    } catch (error) {
      console.error('Error fetching upcoming showtimes:', error)
      throw error
    }
  },

  getRooms: async () => {
    try {
      const response = await movieApi.get('/rooms')
      return response.data
    } catch (error) {
      console.error('Error fetching rooms:', error)
      throw error
    }
  },

  getRoomSeats: async (roomId) => {
    try {
      const response = await movieApi.get(`/seats?room_id=${roomId}&size=500`)
      return response.data
    } catch (error) {
      console.error(`Error fetching seats for room ${roomId}:`, error)
      throw error
    }
  },

  getRoomShowtimes: async (roomId) => {
    try {
      const response = await movieApi.get(`/rooms/${roomId}/showtimes`)
      return response.data
    } catch (error) {
      console.error(`Error fetching showtimes for room ${roomId}:`, error)
      throw error
    }
  },

  searchMovies: async (query) => {
    try {
      const response = await movieApi.get(`/movies?search=${encodeURIComponent(query)}`)
      return response.data
    } catch (error) {
      console.error('Error searching movies:', error)
      throw error
    }
  },

  getMoviesByGenre: async (genre) => {
    try {
      const response = await movieApi.get(`/movies?genre=${encodeURIComponent(genre)}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching movies by genre ${genre}:`, error)
      throw error
    }
  },

  getGenres: async () => {
    try {
      const response = await movieApi.get('/movies/genres')
      return response.data
    } catch (error) {
      console.error('Error fetching genres:', error)
      throw error
    }
  },

  createMovie: async (movieData) => {
    try {
      const response = await movieApi.post('/movies', movieData)
      return response.data
    } catch (error) {
      console.error('Error creating movie:', error)
      throw error
    }
  },

  updateMovie: async (id, movieData) => {
    try {
      const response = await movieApi.put(`/movies/${id}`, movieData)
      return response.data
    } catch (error) {
      console.error('Error updating movie:', error)
      throw error
    }
  },
}

export const {
  getAllMovies,
  getShowingMovies,
  getUpcomingMovies,
  getMovieById,
  getShowtimes,
  getUpcomingShowtimes,
  getRooms,
  getRoomSeats,
  getRoomShowtimes,
  searchMovies,
  getMoviesByGenre,
  getGenres,
  createMovie,
  updateMovie,
} = movieService

export default movieService
