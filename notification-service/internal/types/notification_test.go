package types

import (
	"testing"
	"time"

	"notification-service/internal/models"
)

func TestValidateStatus(t *testing.T) {
	// Test Case ID: TC-NOTI-TYPE-001
	if !ValidateStatus("PENDING") {
		t.Fatal("expected PENDING to be valid")
	}

	// Test Case ID: TC-NOTI-TYPE-002
	if ValidateStatus("UNKNOWN") {
		t.Fatal("expected UNKNOWN to be invalid")
	}
}

func TestCreateNotificationRequest_ToEntity(t *testing.T) {
	// Test Case ID: TC-NOTI-TYPE-003
	req := &CreateNotificationRequest{
		UserID:  "u1",
		Title:   "title",
		Content: "content",
	}

	entity := req.ToEntity()
	if entity.UserId != "u1" {
		t.Fatalf("expected user id u1, got %s", entity.UserId)
	}
	if entity.Status != models.NotificationStatusPending {
		t.Fatalf("expected status PENDING, got %s", entity.Status)
	}
	if entity.CreatedAt == nil || entity.UpdatedAt == nil {
		t.Fatal("expected timestamps to be populated")
	}
}

func TestUpdateNotificationRequest_ApplyUpdates(t *testing.T) {
	now := time.Now().Add(-time.Hour)

	t.Run("chi_cap_nhat_title_status_khi_content_khong_duoc_truyen", func(t *testing.T) {
		title := "Đã xác nhận"
		content := "old content"
		status := "READ"

		// Test Case ID: TC-GO-NOTI-004
		// Mục tiêu: ApplyUpdates chỉ cập nhật các field được truyền vào và luôn làm mới UpdatedAt.
		// Kiểm tra DB: N (hàm thuần trên object trong bộ nhớ).
		// Hoàn tác: N (không có trạng thái DB cần rollback).
		notification := &models.Notification{
			Title:     "old title",
			Content:   "old content",
			Status:    models.NotificationStatusPending,
			UpdatedAt: &now,
		}
		updateReq := &UpdateNotificationRequest{
			Title:  &title,
			Status: &status,
		}

		updateReq.ApplyUpdates(notification)
		if string(notification.Title) != title {
			t.Fatalf("mong muốn title được cập nhật thành %s", title)
		}
		if notification.Content != content {
			t.Fatalf("mong muốn content giữ nguyên là %s", content)
		}
		if notification.Status != models.NotificationStatusRead {
			t.Fatalf("mong muốn status READ, nhận được %s", notification.Status)
		}
		if !notification.UpdatedAt.After(now) {
			t.Fatal("mong muốn updated_at được làm mới")
		}
		t.Logf("ApplyUpdates đã cập nhật title/status và giữ nguyên content; updated_at mới=%v", notification.UpdatedAt)
	})

	t.Run("cap_nhat_content_khi_req_content_khac_nil", func(t *testing.T) {
		title := "Tiêu đề cũ"
		content := "Nội dung mới"
		status := "PENDING"
		notification := &models.Notification{
			Title:     models.NotificationTitle(title),
			Content:   "Nội dung cũ",
			Status:    models.NotificationStatusPending,
			UpdatedAt: &now,
		}
		updateReq := &UpdateNotificationRequest{
			Content: &content,
			Status:  &status,
		}

		updateReq.ApplyUpdates(notification)
		if notification.Content != content {
			t.Fatalf("mong muốn content được cập nhật thành %s", content)
		}
		if notification.Status != models.NotificationStatusPending {
			t.Fatalf("mong muốn status vẫn là PENDING, nhận được %s", notification.Status)
		}
		if !notification.UpdatedAt.After(now) {
			t.Fatal("mong muốn updated_at được làm mới khi cập nhật content")
		}
		t.Logf("ApplyUpdates đã cập nhật content thành công với req.Content != nil; updated_at mới=%v", notification.UpdatedAt)
	})
}
