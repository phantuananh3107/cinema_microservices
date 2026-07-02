import { formatCurrency } from './formatters'

export const printTicket = (ticket) => {
  const printWindow = window.open('', '', 'width=600,height=800')

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Vé xem phim - ${ticket.id}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background: white;
          }

          .ticket-container {
            max-width: 400px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border: 2px solid #e5e7eb;
            border-radius: 10px;
          }

          .header {
            text-center;
            margin-bottom: 30px;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 20px;
          }

          .header h1 {
            color: #2563eb;
            font-size: 28px;
            margin-bottom: 10px;
          }

          .header p {
            color: #6b7280;
            font-size: 14px;
          }

          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #f3f4f6;
          }

          .info-label {
            color: #6b7280;
            font-size: 14px;
            font-weight: 500;
          }

          .info-value {
            color: #111827;
            font-size: 14px;
            font-weight: 600;
            text-align: right;
            max-width: 60%;
            word-wrap: break-word;
          }

          .ticket-id {
            font-family: 'Courier New', monospace;
            color: #1d4ed8;
            font-weight: bold;
          }

          .total-amount {
            color: #059669;
            font-size: 18px;
            font-weight: bold;
          }

          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
          }

          .footer p {
            color: #6b7280;
            font-size: 12px;
            margin-bottom: 5px;
          }

          @media print {
            body {
              padding: 0;
            }
            .ticket-container {
              border: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="ticket-container">
          <div class="header">
            <h1>HQ Cinema</h1>
            <p>Vé xem phim chính thức</p>
          </div>

          <div class="info-row">
            <span class="info-label">Mã vé:</span>
            <span class="info-value ticket-id">${ticket.id}</span>
          </div>

          <div class="info-row">
            <span class="info-label">Phim:</span>
            <span class="info-value">${ticket.movie_title || 'N/A'}</span>
          </div>

          <div class="info-row">
            <span class="info-label">Suất chiếu:</span>
            <span class="info-value">${ticket.showtime_date} ${ticket.showtime_time}</span>
          </div>

          <div class="info-row">
            <span class="info-label">Ghế:</span>
            <span class="info-value">${ticket.seat_row}${ticket.seat_number}</span>
          </div>

          <div class="info-row">
            <span class="info-label">Loại ghế:</span>
            <span class="info-value">${ticket.seat_type || 'Standard'}</span>
          </div>

          <div class="info-row">
            <span class="info-label">Tổng tiền:</span>
            <span class="info-value total-amount">${formatCurrency(ticket.total_amount)}</span>
          </div>

          <div class="footer">
            <p>Vui lòng xuất trình vé này khi vào rạp</p>
            <p>Thời gian in: ${new Date().toLocaleString('vi-VN')}</p>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            }
          }
        </script>
      </body>
    </html>
  `

  printWindow.document.write(htmlContent)
  printWindow.document.close()
}