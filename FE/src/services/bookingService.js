import apiClient from './apiClient'

export const bookingService = {
  getUserBookings: async (page = 1, size = 10, status = '') => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        size: size.toString(),
      })

      if (status) {
        params.append('status', status)
      }

      const response = await apiClient.get(`/bookings/me?${params.toString()}`)
      return response.data
    } catch (error) {
      console.error('Error fetching user bookings:', error)
      throw error
    }
  },

  createBooking: async (bookingData) => {
    try {
      const response = await apiClient.post('/bookings', bookingData)
      return response.data
    } catch (error) {
      console.error('Error creating booking:', error)
      throw error
    }
  },

  getBookingById: async (bookingId) => {
    try {
      const response = await apiClient.get(`/bookings/${bookingId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching booking:', error)
      throw error
    }
  },

  searchTickets: async (bookingId = '', showtimeId = '') => {
    try {
      const params = new URLSearchParams()

      if (bookingId) {
        params.append('booking_id', bookingId)
      }
      if (showtimeId) {
        params.append('showtime_id', showtimeId)
      }

      const response = await apiClient.get(`/tickets/search?${params.toString()}`)
      return response.data
    } catch (error) {
      console.error('Error searching tickets:', error)
      throw error
    }
  },

  markTicketAsUsed: async (ticketId) => {
    try {
      const response = await apiClient.patch(`/tickets/${ticketId}/mark-used`)
      return response.data
    } catch (error) {
      console.error('Error marking ticket as used:', error)
      throw error
    }
  },
}