import { FaCouch } from 'react-icons/fa'
import { COUPLE_ROWS, getSeatTypeLabel } from '../constants/seatConstants'
import { isSeatLocked, isSeatBooked } from '../utils/seatUtils'

const SeatGrid = ({
  seats = [],
  selectedSeats = [],
  lockedSeats = [],
  bookedSeats = [],
  onSeatClick,
  showScreen = true,
  showEntrance = true,
  showLegend = true,
  colorScheme = 'client',
  interactive = true,
  className = ''
}) => {
  const coupleRows = COUPLE_ROWS

  const createSeatGrid = () => {
    if (!seats || !Array.isArray(seats) || seats.length === 0) {
      return {}
    }

    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O']
    const grid = {}

    rows.forEach((row) => {
      grid[row] = {}
      const seatsPerRow = coupleRows.includes(row) ? 5 : 16
      for (let i = 1; i <= seatsPerRow; i++) {
        grid[row][i] = null
      }
    })

    seats.forEach((seat) => {
      const seatNum = parseInt(seat.seat_number)
      if (grid[seat.row_number] && grid[seat.row_number][seatNum] !== undefined) {
        grid[seat.row_number][seatNum] = seat
      }
    })

    return grid
  }

  const getSeatColor = (seat) => {
    const isSelected = selectedSeats.some(s => s.id === seat.id)
    const isLocked = isSeatLocked(seat, lockedSeats)
    const isBooked = isSeatBooked(seat, bookedSeats)

    if (colorScheme === 'admin') {
      if (!seat) {
        return 'bg-gray-100 border-gray-300 hover:bg-gray-200 cursor-pointer'
      }

      switch (seat.status) {
        case 'AVAILABLE':
          switch (seat.seat_type) {
            case 'REGULAR':
              return 'bg-green-200 border-green-400 text-green-800 hover:bg-green-300'
            case 'VIP':
              return 'bg-yellow-200 border-yellow-400 text-yellow-800 hover:bg-yellow-300'
            case 'COUPLE':
              return 'bg-pink-200 border-pink-400 text-pink-800 hover:bg-pink-300'
            default:
              return 'bg-green-200 border-green-400 text-green-800 hover:bg-green-300'
          }
        case 'OCCUPIED':
          return 'bg-red-200 border-red-400 text-red-800 cursor-not-allowed'
        case 'MAINTENANCE':
          return 'bg-orange-200 border-orange-400 text-orange-800 cursor-not-allowed'
        case 'BLOCKED':
          return 'bg-gray-300 border-gray-500 text-gray-700 cursor-not-allowed'
        default:
          return 'bg-gray-200 border-gray-400 text-gray-700'
      }
    }

    if (isSelected) {
      return 'bg-red-600 border-red-500 text-white'
    }

    if (isBooked) {
      return 'bg-gray-500 border-gray-400 text-gray-300 cursor-not-allowed'
    }

    if (seat.status === 'OCCUPIED') {
      return 'bg-gray-500 border-gray-400 text-gray-300 cursor-not-allowed'
    }

    if (seat.status === 'MAINTENANCE' || seat.status === 'BLOCKED') {
      return 'bg-gray-700 border-gray-600 text-gray-400 cursor-not-allowed'
    }

    if (isLocked) {
      return 'bg-orange-600 border-orange-500 text-orange-200 cursor-not-allowed'
    }

    switch (seat.seat_type) {
      case 'REGULAR':
        return 'bg-green-600 border-green-500 text-white hover:bg-green-500 cursor-pointer'
      case 'VIP':
        return 'bg-yellow-600 border-yellow-500 text-white hover:bg-yellow-500 cursor-pointer'
      case 'COUPLE':
        return 'bg-pink-600 border-pink-500 text-white hover:bg-pink-500 cursor-pointer'
      default:
        return 'bg-green-600 border-green-500 text-white hover:bg-green-500 cursor-pointer'
    }
  }

  const handleSeatClick = (seat) => {
    if (!interactive || !onSeatClick) return
    onSeatClick(seat)
  }

  const grid = createSeatGrid()
  const hasSeats = Object.keys(grid).length > 0

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {showScreen && (
        <div className="mb-8">
          <div className={`${colorScheme === 'admin' ? 'bg-gray-800' : 'bg-gray-800'} text-white py-3 px-16 rounded-lg text-sm font-medium shadow-lg`}>
            MÀN HÌNH
          </div>
          <div className="text-center text-xs text-gray-500 mt-1">SCREEN</div>
        </div>
      )}

      {hasSeats ? (
        <div className="overflow-x-auto">
          <div className="inline-block">
            {Object.entries(grid)
              .filter(([_, rowSeats]) => {
                return Object.values(rowSeats).some(seat => seat !== null)
              })
              .map(([row, rowSeats]) => {
                const isCouple = coupleRows.includes(row)
                return (
                  <div key={row} className="flex items-center justify-center mb-3">
                    <div className={`w-8 text-center text-sm font-bold ${colorScheme === 'admin' ? 'text-gray-700' : 'text-gray-300'} mr-4`}>
                      {row}
                    </div>

                    <div className={`flex ${isCouple ? 'gap-3' : 'gap-1'} justify-center`}>
                      {Object.entries(rowSeats)
                        .filter(([_, seat]) => seat !== null)
                        .map(([seatNumber, seat]) => {
                          const isCoupleType = seat.seat_type === 'COUPLE'
                          const canClick = interactive && onSeatClick
                          
                          return (
                            <button
                              key={`${row}-${seatNumber}`}
                              onClick={() => handleSeatClick(seat)}
                              disabled={!canClick}
                              className={`${isCoupleType ? 'w-12' : 'w-8'} h-8 border-2 rounded text-xs font-semibold transition-all hover:scale-110 ${getSeatColor(seat)}`}
                              title={`${row}${seatNumber.padStart(2, '0')} - ${getSeatTypeLabel(seat.seat_type)}`}
                            >
                              {isCoupleType ? (
                                <div className="flex items-center justify-center">
                                  <FaCouch className="w-3 h-3" />
                                </div>
                              ) : (
                                seatNumber.padStart(2, '0')
                              )}
                            </button>
                          )
                        })}
                    </div>

                    <div className={`w-8 text-center text-sm font-bold ${colorScheme === 'admin' ? 'text-gray-700' : 'text-gray-300'} ml-4`}>
                      {row}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className={`${colorScheme === 'admin' ? 'text-gray-500' : 'text-gray-400'} mb-4`}>
            {seats.length === 0 ? 'Đang tải ghế...' : 'Không có dữ liệu ghế'}
          </p>
        </div>
      )}

      {showEntrance && hasSeats && (
        <div className="mt-8 text-center">
          <div className="text-xs text-gray-500 mb-2">ENTRANCE</div>
          <div className="w-24 h-1 bg-gray-300 rounded"></div>
        </div>
      )}

      {showLegend && hasSeats && (
        <div className={`mt-6 pt-4 ${colorScheme === 'admin' ? 'border-t border-gray-200' : 'border-t border-gray-700'} w-full`}>
          <h4 className={`text-sm font-medium ${colorScheme === 'admin' ? 'text-gray-900' : 'text-white'} mb-3`}>
            Chú thích:
          </h4>
          <div className="flex flex-wrap gap-4 text-sm">
            {colorScheme === 'admin' ? (
              <>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="inline-block w-4 h-4 bg-green-200 border border-green-400 rounded"></span>
                  Thường
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="inline-block w-4 h-4 bg-yellow-200 border border-yellow-400 rounded"></span>
                  VIP
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="inline-block w-4 h-4 bg-pink-200 border border-pink-400 rounded"></span>
                  Đôi
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="inline-block w-4 h-4 bg-red-200 border border-red-400 rounded"></span>
                  Đã đặt
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="inline-block w-4 h-4 bg-orange-200 border border-orange-400 rounded"></span>
                  Bảo trì
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="inline-block w-4 h-4 bg-gray-300 border border-gray-500 rounded"></span>
                  Bị chặn
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="inline-block w-4 h-4 bg-green-600 border border-green-500 rounded"></span>
                  Thường
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="inline-block w-4 h-4 bg-yellow-600 border border-yellow-500 rounded"></span>
                  VIP
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="inline-block w-4 h-4 bg-pink-600 border border-pink-500 rounded"></span>
                  Đôi
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="inline-block w-4 h-4 bg-red-600 border border-red-500 rounded"></span>
                  Đã chọn
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="inline-block w-4 h-4 bg-gray-500 border border-gray-400 rounded"></span>
                  Đã đặt
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="inline-block w-4 h-4 bg-orange-600 border border-orange-500 rounded"></span>
                  Đang được đặt
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SeatGrid

