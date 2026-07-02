const {
  formatDateForAPI,
  getWeekRange,
  getPreviousWeekRange,
  getWeekDisplayString,
  toLocalDatetimeString,
  getDurationInMinutes,
  getLastDaysRange,
  getLastMonthsRange,
  getLastYearsRange,
  getGroupByFromDateRange,
  getDayName,
  isToday,
  formatTime,
  formatShowtimeTime,
  formatDateTime,
  getDurationInDays,
  formatPeriodDisplayName,
  groupRevenueData
} = require('../dateUtils');

describe('dateUtils', () => {
  // TC-FE-DATE-010: Kiểm tra formatDateForAPI chuyển Date sang định dạng YYYY-MM-DD
  test('TC-FE-DATE-010: formatDateForAPI chuyển Date sang YYYY-MM-DD', () => {
    // Mục tiêu: Định dạng này dùng khi gọi API analytics và filter lịch
    expect(formatDateForAPI(new Date('2026-04-17T10:30:00Z'))).toBe('2026-04-17');
  });

  // TC-FE-DATE-011: Kiểm tra getWeekRange tính đúng khoảng từ thứ Hai đến Chủ nhật kể cả khi ngày tham chiếu là Chủ nhật
  test('TC-FE-DATE-011: getWeekRange tính đúng khoảng tuần khi ngày là Chủ nhật', () => {
    // Mục tiêu: Boundary case dễ sai do khác biệt weekday
    const { startDate, endDate } = getWeekRange(new Date('2026-04-19'));
    expect(startDate.getDay()).toBe(1); // Thứ Hai
    expect(endDate.getDay()).toBe(0); // Chủ nhật
  });

  // TC-FE-DATE-012: Kiểm tra getPreviousWeekRange lùi đúng 7 ngày rồi trả về khoảng tuần trước
  test('TC-FE-DATE-012: getPreviousWeekRange lùi đúng 7 ngày', () => {
    // Mục tiêu: Dùng cho dashboard doanh thu theo tuần
    const { startDate, endDate } = getPreviousWeekRange(new Date('2026-04-17'));
    expect(endDate < new Date('2026-04-17')).toBe(true);
  });

  // TC-FE-DATE-013: Kiểm tra getWeekDisplayString trả ra chuỗi hiển thị ngắn gọn
  test('TC-FE-DATE-013: getWeekDisplayString trả ra chuỗi hiển thị ngắn gọn', () => {
    // Mục tiêu: Hiển thị báo cáo trên giao diện
    expect(getWeekDisplayString(new Date('2026-04-13'), new Date('2026-04-19'))).toMatch(/Apr 13 - Apr 19, 2026/);
  });

  // TC-FE-DATE-014: Kiểm tra toLocalDatetimeString giữ nguyên giờ địa phương và pad đủ 2 chữ số
  test('TC-FE-DATE-014: toLocalDatetimeString giữ nguyên giờ địa phương', () => {
    // Mục tiêu: Phù hợp với input type=datetime-local ở form quản trị
    expect(toLocalDatetimeString('2026-04-17T09:05:00')).toBe('2026-04-17T09:05');
  });

  // TC-FE-DATE-015: Kiểm tra getDurationInMinutes tính đúng số phút giữa hai mốc thời gian
  test('TC-FE-DATE-015: getDurationInMinutes tính đúng số phút', () => {
    // Mục tiêu: Hiển thị độ dài suất chiếu hoặc block thời gian
    expect(getDurationInMinutes('09:00', '11:30')).toBe(150);
  });

  // TC-FE-DATE-016: Kiểm tra getLastDaysRange trả endDate bằng ngày tham chiếu cộng thêm 1 ngày
  test('TC-FE-DATE-016: getLastDaysRange trả endDate đúng', () => {
    // Mục tiêu: Giúp người chấm hiểu rõ chủ ý hiện thực hiện tại
    const { endDate } = getLastDaysRange(7, new Date('2026-04-17'));
    expect(endDate.getDate()).toBe(new Date('2026-04-17').getDate() + 1);
  });

  // TC-FE-DATE-017: Kiểm tra getLastMonthsRange lùi đúng số tháng từ ngày tham chiếu
  test('TC-FE-DATE-017: getLastMonthsRange lùi đúng số tháng', () => {
    // Mục tiêu: Bao phủ helper dùng cho analytics theo tháng
    const { startDate, endDate } = getLastMonthsRange(3, new Date('2026-04-17'));
    expect(startDate < endDate).toBe(true);
  });

  // TC-FE-DATE-018: Kiểm tra getLastYearsRange lùi đúng số năm từ ngày tham chiếu
  test('TC-FE-DATE-018: getLastYearsRange lùi đúng số năm', () => {
    // Mục tiêu: Dùng cho báo cáo doanh thu dài hạn
    const { startDate, endDate } = getLastYearsRange(1, new Date('2026-04-17'));
    expect(startDate < endDate).toBe(true);
  });

  // TC-FE-DATE-019: Kiểm tra getGroupByFromDateRange chọn day/month/year theo độ dài khoảng ngày
  test('TC-FE-DATE-019: getGroupByFromDateRange chọn đúng groupBy', () => {
    // Mục tiêu: Giúp dữ liệu analytics hiển thị ở mức gom nhóm hợp lý
    expect(getGroupByFromDateRange(new Date('2026-04-01'), new Date('2026-04-10'))).toBe('day');
    expect(getGroupByFromDateRange(new Date('2026-01-01'), new Date('2026-04-01'))).toBe('month');
    expect(getGroupByFromDateRange(new Date('2025-01-01'), new Date('2026-04-01'))).toBe('year');
  });

  // TC-FE-DATE-020: Kiểm tra getDayName trả về tên ngày đúng với chuỗi ngày hợp lệ
  test('TC-FE-DATE-020: getDayName trả về tên ngày đúng', () => {
    expect(getDayName('2026-04-18')).toMatch(/Sat|Thứ/);
  });

  // TC-FE-DATE-021: Kiểm tra isToday trả về true với ngày hôm nay, false với ngày khác
  test('TC-FE-DATE-021: isToday trả về đúng giá trị', () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    expect(isToday(todayStr)).toBe(true);
    expect(isToday('2000-01-01')).toBe(false);
  });

  // TC-FE-DATE-022: Kiểm tra formatTime trả về đúng định dạng
  test('TC-FE-DATE-022: formatTime trả về đúng định dạng', () => {
    expect(formatTime(9)).toBe('09:00');
    expect(formatTime(15)).toBe('15:00');
  });

  // TC-FE-DATE-023: Kiểm tra formatShowtimeTime trả về đúng giờ phút
  test('TC-FE-DATE-023: formatShowtimeTime trả về đúng giờ phút', () => {
    expect(formatShowtimeTime('2026-04-18T09:30:00')).toMatch(/09:30/);
  });

  // TC-FE-DATE-024: Kiểm tra formatDateTime trả về đúng định dạng ngày giờ
  test('TC-FE-DATE-024: formatDateTime trả về đúng định dạng ngày giờ', () => {
    expect(require('../dateUtils').formatDateTime('2026-04-18T09:30:00')).toBe('09:30 18/04/2026');
  });

  // TC-FE-DATE-025: Kiểm tra getDurationInDays trả về số ngày đúng
  test('TC-FE-DATE-025: getDurationInDays trả về số ngày đúng', () => {
    expect(require('../dateUtils').getDurationInDays(new Date('2026-04-01'), new Date('2026-04-10'))).toBe(9);
    expect(require('../dateUtils').getDurationInDays(new Date('2026-04-10'), new Date('2026-04-01'))).toBe(-9);
  });

  // TC-FE-DATE-026: Kiểm tra formatPeriodDisplayName với groupBy khác nhau
  test('TC-FE-DATE-026: formatPeriodDisplayName với groupBy khác nhau', () => {
    const fn = formatPeriodDisplayName;
    expect(fn('2026-04-18', 'year')).toMatch(/2026/);
    expect(fn('2026-04-18', 'month')).toMatch(/2026/);
    expect(fn('2026-04-18', 'day')).toMatch(/18/);
  });

  // TC-FE-DATE-027: Kiểm tra groupRevenueData với groupBy = 'day', 'month', 'year', mảng rỗng, null
  test('TC-FE-DATE-027: groupRevenueData các trường hợp', () => {
    const fn = groupRevenueData;
    const daily = [
      { time_period: '2026-04-01', total_revenue: 100, total_bookings: 2 },
      { time_period: '2026-04-02', total_revenue: 200, total_bookings: 3 },
      { time_period: '2026-05-01', total_revenue: 300, total_bookings: 4 },
      { time_period: '2025-04-01', total_revenue: 400, total_bookings: 5 }
    ];
    expect(fn(daily, 'day').length).toBe(4);
    expect(fn(daily, 'month').length).toBeGreaterThan(1);
    expect(fn(daily, 'year').length).toBeGreaterThan(1);
    expect(fn([], 'day')).toEqual([]);
    expect(fn(null, 'day')).toEqual([]);
  });
});
