import { FaTimes, FaTicketAlt, FaFilm, FaClock } from 'react-icons/fa'
import { formatCurrency } from '../../utils/formatters'
import { printTicket } from '../../utils/printTicket'

export default function TicketModal({ ticket, isOpen, onClose }) {
  if (!isOpen || !ticket) return null

  const handlePrint = () => {
    printTicket(ticket)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4" style={{ zIndex: 9999 }}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Vé xem phim</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FaTimes />
          </button>
        </div>

        <div className="p-6">
          {/* Cinema Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-blue-600 mb-2">HQ Cinema</h1>
            <p className="text-sm text-gray-600">Vé xem phim chính thức</p>
          </div>

          {/* Ticket Info */}
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">Mã vé:</span>
              <span className="font-mono text-sm font-bold text-blue-700">{ticket.id}</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">Phim:</span>
              <span className="text-sm font-semibold text-gray-900">{ticket.movie_title || 'N/A'}</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">Suất chiếu:</span>
              <span className="text-sm text-gray-900">
                {ticket.showtime_date} {ticket.showtime_time}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">Ghế:</span>
              <span className="text-sm font-bold text-gray-900">
                {ticket.seat_row}{ticket.seat_number}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">Loại ghế:</span>
              <span className="text-sm text-gray-900">{ticket.seat_type || 'Standard'}</span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium text-gray-600">Tổng tiền:</span>
              <span className="text-lg font-bold text-green-600">{formatCurrency(ticket.total_amount)}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500 mb-2">
              Vui lòng xuất trình vé này khi vào rạp
            </p>
            <p className="text-xs text-gray-500">
              Thời gian in: {new Date().toLocaleString('vi-VN')}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handlePrint}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              <FaTicketAlt className="text-xs" />
              In vé
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
