import apiClient from './apiClient'

export const boxOfficeService = {
  createBoxOfficeBooking: async (bookingData) => {
    const response = await apiClient.post('/bookings', {
      ...bookingData,
      booking_type: 'OFFLINE'
    })
    return response.data
  },
}

export default boxOfficeService