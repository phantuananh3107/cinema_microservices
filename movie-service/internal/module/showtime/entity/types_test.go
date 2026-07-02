package entity

import (
	"testing"
	"time"
)

func TestCreateShowtimeRequest_IsValid(t *testing.T) {
	start := time.Date(2026, 4, 14, 9, 0, 0, 0, time.UTC)
	end := time.Date(2026, 4, 14, 11, 0, 0, 0, time.UTC)

	// Test Case ID: TC-GO-MOV-023
	// Mục tiêu: IsValid trả về true khi movie_id/room_id hợp lệ, start < end và base_price >= 0.
	// Kiểm tra DB: N.
	// Hoàn tác: N.
	valid := CreateShowtimeRequest{
		MovieId:   "m1",
		RoomId:    "r1",
		StartTime: start,
		EndTime:   end,
		BasePrice: 75000,
	}
	if !valid.IsValid() {
		t.Fatal("mong muốn request hợp lệ trả về true")
	}
	t.Logf("IsValid trả về true với movie_id=%s room_id=%s base_price=%.0f", valid.MovieId, valid.RoomId, valid.BasePrice)

	t.Run("tra_ve_false_khi_movie_id_hoac_room_id_rong", func(t *testing.T) {
		// Test Case ID: TC-GO-MOV-023 (nhánh invalid bắt buộc)
		reqMissingMovie := valid
		reqMissingMovie.MovieId = ""
		if reqMissingMovie.IsValid() {
			t.Fatal("mong muốn IsValid trả về false khi movie_id rỗng")
		}

		reqMissingRoom := valid
		reqMissingRoom.RoomId = ""
		if reqMissingRoom.IsValid() {
			t.Fatal("mong muốn IsValid trả về false khi room_id rỗng")
		}
	})

	t.Run("tra_ve_false_khi_base_price_am", func(t *testing.T) {
		// Test Case ID: TC-GO-MOV-023 (nhánh invalid bắt buộc)
		reqNegativePrice := valid
		reqNegativePrice.BasePrice = -1
		if reqNegativePrice.IsValid() {
			t.Fatal("mong muốn IsValid trả về false khi base_price âm")
		}
	})

	t.Run("tra_ve_false_khi_end_time_nho_hon_hoac_bang_start_time", func(t *testing.T) {
		// Test Case ID: TC-GO-MOV-023 (nhánh invalid bắt buộc)
		reqEqualTime := valid
		reqEqualTime.EndTime = reqEqualTime.StartTime
		if reqEqualTime.IsValid() {
			t.Fatal("mong muốn IsValid trả về false khi end_time bằng start_time")
		}

		reqBeforeTime := valid
		reqBeforeTime.EndTime = reqBeforeTime.StartTime.Add(-time.Minute)
		if reqBeforeTime.IsValid() {
			t.Fatal("mong muốn IsValid trả về false khi end_time nhỏ hơn start_time")
		}
	})
}

func TestCreateShowtimeRequest_ToShowtime(t *testing.T) {
	start := time.Date(2026, 4, 14, 9, 17, 0, 0, time.UTC)
	end := time.Date(2026, 4, 14, 9, 20, 0, 0, time.UTC)

	// Test Case ID: TC-GO-MOV-024
	// Mục tiêu: ToShowtime làm tròn mốc giờ, tự đẩy endTime tối thiểu +2h khi end <= start và gán status SCHEDULED.
	// Kiểm tra DB: N.
	// Hoàn tác: N.
	req := CreateShowtimeRequest{
		MovieId:   "movie-1",
		RoomId:    "room-1",
		StartTime: start,
		EndTime:   end,
		Format:    ShowtimeFormat2D,
		BasePrice: 90000,
	}

	showtime := req.ToShowtime()
	if showtime.StartTime.Minute() != 0 {
		t.Fatalf("mong muốn phút của startTime sau khi làm tròn là 0, nhận được %d", showtime.StartTime.Minute())
	}
	if !showtime.EndTime.Equal(showtime.StartTime.Add(2 * time.Hour)) {
		t.Fatalf("mong muốn endTime được điều chỉnh thành +2h, nhận được %s", showtime.EndTime)
	}
	if showtime.Status != ShowtimeStatusScheduled {
		t.Fatalf("mong muốn status mặc định SCHEDULED, nhận được %s", showtime.Status)
	}
	t.Logf("ToShowtime đã làm tròn giờ và tạo showtime status=%s start=%s end=%s", showtime.Status, showtime.StartTime.Format(time.RFC3339), showtime.EndTime.Format(time.RFC3339))
}
