import { useState, useEffect, useCallback } from 'react'
import { clientSeatService } from '../services/clientSeatService'

/**
 * Custom hook to manage locked and booked seats for a showtime
 * Handles initial fetch and periodic polling
 *
 * @param {string} showtimeId - The ID of the showtime
 * @param {Array} seats - Array of all seats in the room
 * @param {Array} selectedSeats - Currently selected seats
 * @param {Function} setSelectedSeats - Function to update selected seats
 * @param {boolean} enabled - Whether polling is enabled (default: true)
 * @returns {Object} { lockedSeats, bookedSeats, fetchLockedSeats }
 */
export const useLockedSeats = (
  showtimeId,
  seats,
  selectedSeats,
  setSelectedSeats,
  enabled = true
) => {
  const [lockedSeats, setLockedSeats] = useState([])
  const [bookedSeats, setBookedSeats] = useState([])

  const fetchLockedSeats = useCallback(async () => {
    if (!showtimeId || seats.length === 0) {
      return
    }

    try {
      const response = await clientSeatService.getLockedSeats(showtimeId)
      const lockedSeatIds = response.data?.locked_seat_ids || []
      const bookedSeatIds = response.data?.booked_seat_ids || []

      const newLockedSeats = seats.filter(seat => lockedSeatIds.includes(seat.id))
      const newBookedSeats = seats.filter(seat => bookedSeatIds.includes(seat.id))

      setLockedSeats(newLockedSeats)
      setBookedSeats(newBookedSeats)

      if (selectedSeats.length > 0) {
        const unavailableSeatIds = [...lockedSeatIds, ...bookedSeatIds]
        const updatedSelectedSeats = selectedSeats.filter(seat => !unavailableSeatIds.includes(seat.id))
        if (updatedSelectedSeats.length !== selectedSeats.length) {
          setSelectedSeats(updatedSelectedSeats)
        }
      }
    } catch (err) {
      console.error('Error fetching locked seats:', err)
    }
  }, [showtimeId, seats, selectedSeats, setSelectedSeats])

  useEffect(() => {
    if (!enabled || !showtimeId || seats.length === 0 || selectedSeats.length > 0) {
      return
    }

    fetchLockedSeats().then()

    const intervalId = setInterval(fetchLockedSeats, 10000)

    return () => clearInterval(intervalId)
  }, [enabled, showtimeId, seats, selectedSeats.length, fetchLockedSeats])

  return {
    lockedSeats,
    bookedSeats,
    fetchLockedSeats
  }
}
