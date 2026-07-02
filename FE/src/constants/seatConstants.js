export const SEAT_TYPES = {
  REGULAR: 'REGULAR',
  VIP: 'VIP',
  COUPLE: 'COUPLE'
}

export const SEAT_STATUSES = {
  AVAILABLE: 'AVAILABLE',
  OCCUPIED: 'OCCUPIED',
  MAINTENANCE: 'MAINTENANCE',
  BLOCKED: 'BLOCKED'
}

export const SEAT_TYPE_MULTIPLIERS = {
  [SEAT_TYPES.REGULAR]: 1.0,
  [SEAT_TYPES.VIP]: 1.5,
  [SEAT_TYPES.COUPLE]: 2.5
}

export const SEAT_TYPE_LABELS = {
  [SEAT_TYPES.REGULAR]: 'Ghế thường',
  [SEAT_TYPES.VIP]: 'Ghế VIP',
  [SEAT_TYPES.COUPLE]: 'Ghế đôi'
}

export const SEAT_STATUS_LABELS = {
  [SEAT_STATUSES.AVAILABLE]: 'Có sẵn',
  [SEAT_STATUSES.OCCUPIED]: 'Đã đặt',
  [SEAT_STATUSES.MAINTENANCE]: 'Bảo trì',
  [SEAT_STATUSES.BLOCKED]: 'Bị khóa'
}

export const COUPLE_ROWS = ['M', 'N', 'O']

export const getSeatTypeLabel = (type) => {
  if (!type) return ''
  const normalizedType = type.toUpperCase()
  return SEAT_TYPE_LABELS[normalizedType] || type
}

export const getSeatPrice = (seatType, basePrice) => {
  if (!basePrice || !seatType) return 0
  const normalizedType = seatType.toUpperCase()
  const multiplier = SEAT_TYPE_MULTIPLIERS[normalizedType] || 1.0
  return Math.round(basePrice * multiplier)
}

export const calculateBookingTotal = (selectedSeats, basePrice) => {
  if (!selectedSeats || !Array.isArray(selectedSeats) || !basePrice) return 0
  return selectedSeats.reduce((total, seat) => {
    return total + getSeatPrice(seat.seat_type, basePrice)
  }, 0)
}

export const getSeatPriceBreakdown = (selectedSeats, basePrice) => {
  if (!selectedSeats || !Array.isArray(selectedSeats)) return []
  return selectedSeats.map(seat => ({
    seat: `${seat.row_number}${seat.seat_number}`,
    type: seat.seat_type,
    price: getSeatPrice(seat.seat_type, basePrice)
  }))
}
