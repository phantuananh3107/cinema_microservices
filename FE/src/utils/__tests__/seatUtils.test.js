const { isSeatLocked, isSeatBooked, isSeatUnavailable, isSeatClickable } = require('../seatUtils');

describe('seatUtils', () => {
  // TC-FE-SEAT-001: Kiểm tra isSeatLocked trả về true khi seat xuất hiện trong lockedSeats
  test('TC-FE-SEAT-001: isSeatLocked returns true when seat is in lockedSeats', () => {
    // Mục tiêu: Đảm bảo hàm nhận diện đúng ghế đang bị giữ chỗ
    // Dữ liệu test: seat.id = 'A1', lockedSeats = [{ id: 'A1' }]
    // Expected: true
    expect(isSeatLocked({ id: 'A1' }, [{ id: 'A1' }])).toBe(true);
  });

  // TC-FE-SEAT-002: Kiểm tra isSeatLocked trả về false khi lockedSeats rỗng hoặc không chứa seat hiện tại
  test('TC-FE-SEAT-002: isSeatLocked returns false when lockedSeats is empty', () => {
    // Mục tiêu: Bao phủ nhánh không khóa để tránh ẩn nhầm ghế trống
    // Dữ liệu test: seat.id = 'A1', lockedSeats = []
    // Expected: false
    expect(isSeatLocked({ id: 'A1' }, [])).toBe(false);
    // Dữ liệu test: seat.id = 'A1', lockedSeats = [{ id: 'A2' }]
    expect(isSeatLocked({ id: 'A1' }, [{ id: 'A2' }])).toBe(false);
  });

  // TC-FE-SEAT-003: Kiểm tra isSeatBooked trả về true khi seat đã thuộc bookedSeats
  test('TC-FE-SEAT-003: isSeatBooked returns true when seat is in bookedSeats', () => {
    // Mục tiêu: Điều kiện quyết định trạng thái đã bán trên sơ đồ ghế
    // Dữ liệu test: seat.id = 'A2', bookedSeats = [{ id: 'A2' }]
    // Expected: true
    expect(isSeatBooked({ id: 'A2' }, [{ id: 'A2' }])).toBe(true);
  });

  // TC-FE-SEAT-004: Kiểm tra isSeatUnavailable nhận diện đúng ghế OCCUPIED
  test('TC-FE-SEAT-004: isSeatUnavailable returns true for OCCUPIED seat', () => {
    // Mục tiêu: Bao phủ nhánh unavailable phổ biến nhất
    // Dữ liệu test: seat.status = 'OCCUPIED'
    // Expected: true
    expect(isSeatUnavailable({ status: 'OCCUPIED' })).toBe(true);
  });

  // TC-FE-SEAT-005: Kiểm tra isSeatUnavailable nhận diện đúng ghế MAINTENANCE
  test('TC-FE-SEAT-005: isSeatUnavailable returns true for MAINTENANCE seat', () => {
    // Mục tiêu: Trường hợp ghế bảo trì cần bị vô hiệu hóa trên UI
    // Dữ liệu test: seat.status = 'MAINTENANCE'
    // Expected: true
    expect(isSeatUnavailable({ status: 'MAINTENANCE' })).toBe(true);
  });

  // TC-FE-SEAT-006: Kiểm tra isSeatUnavailable nhận diện đúng ghế BLOCKED
  test('TC-FE-SEAT-006: isSeatUnavailable returns true for BLOCKED seat', () => {
    // Mục tiêu: Giúp giao diện phản ánh đúng ghế bị chặn thủ công
    // Dữ liệu test: seat.status = 'BLOCKED'
    // Expected: true
    expect(isSeatUnavailable({ status: 'BLOCKED' })).toBe(true);
  });

  // TC-FE-SEAT-007: Kiểm tra isSeatClickable trả về false khi seat vốn đã unavailable
  test('TC-FE-SEAT-007: isSeatClickable returns false for unavailable seat', () => {
    // Mục tiêu: Hợp nhất để bảo vệ trải nghiệm chọn ghế
    // Dữ liệu test: seat.status = 'OCCUPIED'
    // Expected: false
    expect(isSeatClickable({ status: 'OCCUPIED' }, [], [])).toBe(false);
  });

  // TC-FE-SEAT-008: Kiểm tra isSeatClickable trả về false khi ghế đang bị locked bởi phiên khác
  test('TC-FE-SEAT-008: isSeatClickable returns false when seat is locked', () => {
    // Mục tiêu: Bảo vệ tránh đặt trùng khi nhiều người thao tác đồng thời
    // Dữ liệu test: seat.id = 'A3', status = 'AVAILABLE', lockedSeats = [{ id: 'A3' }]
    // Expected: false
    expect(isSeatClickable({ id: 'A3', status: 'AVAILABLE' }, [{ id: 'A3' }], [])).toBe(false);
  });

  // TC-FE-SEAT-009: Kiểm tra isSeatClickable trả về true khi ghế available và không nằm trong locked/booked lists
  test('TC-FE-SEAT-009: isSeatClickable returns true for available seat', () => {
    // Mục tiêu: Positive case cơ bản của màn hình đặt ghế
    // Dữ liệu test: seat.id = 'A4', status = 'AVAILABLE', lockedSeats = [], bookedSeats = []
    // Expected: true
    expect(isSeatClickable({ id: 'A4', status: 'AVAILABLE' }, [], [])).toBe(true);
  });
});
