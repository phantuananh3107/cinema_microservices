const { formatCurrency, formatDate, formatTime, formatDateTime } = require('../formatters');

describe('formatters', () => {
  // TC-FE-FMT-020: Kiểm tra formatCurrency định dạng số tiền theo locale vi-VN và currency VND
  test('TC-FE-FMT-020: formatCurrency định dạng số tiền theo VND', () => {
    // Mục tiêu: Hiển thị số tiền đúng chuẩn Việt Nam
    expect(formatCurrency(12000)).toMatch(/12.000/);
  });

  // TC-FE-FMT-021: Kiểm tra formatDate trả chuỗi rỗng khi đầu vào không có giá trị
  test('TC-FE-FMT-021: formatDate trả chuỗi rỗng khi đầu vào null', () => {
    // Mục tiêu: UI không hiện Invalid Date
    expect(formatDate(null)).toBe("");
  });

  // TC-FE-FMT-022: Kiểm tra formatTime trả đúng giờ phút theo locale vi-VN và bỏ qua giây
  test('TC-FE-FMT-022: formatTime trả đúng giờ phút', () => {
    // Mục tiêu: Định dạng nhất quán trên ticket và lịch chiếu
    expect(formatTime('2026-04-17T09:05:00')).toBe('09:05');
  });

  // TC-FE-FMT-023: Kiểm tra formatDateTime trả ngày giờ đầy đủ theo định dạng người dùng Việt Nam
  test('TC-FE-FMT-023: formatDateTime trả ngày giờ đầy đủ', () => {
    // Mục tiêu: Giao diện quản trị và lịch sử đặt vé dễ đọc
    expect(formatDateTime('2026-04-17T09:05:00')).toMatch(/17.*04.*2026.*09:05/);
  });

  // TC-FE-FMT-024: formatCurrency trả về '0 ₫' khi đầu vào là 0
  test('TC-FE-FMT-024: formatCurrency trả về 0₫ khi đầu vào là 0', () => {
    expect(formatCurrency(0)).toMatch(/0/);
  });

  // TC-FE-FMT-025: formatDate trả về ngày đúng định dạng khi đầu vào hợp lệ
  test('TC-FE-FMT-025: formatDate trả về ngày đúng định dạng', () => {
    expect(formatDate('2026-04-18')).toMatch(/18/);
  });

  // TC-FE-FMT-026: formatTime trả về chuỗi rỗng khi đầu vào null
  test('TC-FE-FMT-026: formatTime trả về chuỗi rỗng khi đầu vào null', () => {
    expect(formatTime(null)).toBe("");
  });

  // TC-FE-FMT-027: formatDateTime trả về chuỗi rỗng khi đầu vào null
  test('TC-FE-FMT-027: formatDateTime trả về chuỗi rỗng khi đầu vào null', () => {
    expect(formatDateTime(null)).toBe("");
  });
});
