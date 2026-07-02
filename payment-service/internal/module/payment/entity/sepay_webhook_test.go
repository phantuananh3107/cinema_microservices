package entity

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestSePayWebhook_ToPayload(t *testing.T) {
	// Test Case ID: TC-GO-ENT-022
	// Mục tiêu: ToPayload phải serialize đầy đủ trường chính để phục vụ truy vết giao dịch.
	// Kiểm tra DB: N (hàm entity thuần).
	// Hoàn tác: N.
	webhook := &SePayWebhook{
		Id:             999100,
		Gateway:        "SEPAY",
		AccountNumber:  "123456789",
		TransferType:   "in",
		TransferAmount: 12000,
		ReferenceCode:  "REF-001",
		Content:        "QHD15B35985F49488EA0C3454F12885F8E",
		Description:    "Thanh toan ve phim",
	}

	payload, err := webhook.ToPayload()
	if err != nil {
		t.Fatalf("mong muốn không có lỗi khi serialize payload, nhận được %v", err)
	}
	if !strings.Contains(payload, "\"gateway\":\"SEPAY\"") {
		t.Fatalf("payload phải chứa trường gateway, nhận được %s", payload)
	}
	if !strings.Contains(payload, "\"referenceCode\":\"REF-001\"") {
		t.Fatalf("payload phải chứa trường referenceCode, nhận được %s", payload)
	}

	var decoded map[string]interface{}
	if err := json.Unmarshal([]byte(payload), &decoded); err != nil {
		t.Fatalf("payload trả về không phải JSON hợp lệ: %v", err)
	}
	if decoded["id"] != float64(999100) || decoded["content"] != webhook.Content || decoded["description"] != webhook.Description {
		t.Fatalf("payload thiếu trường truy vết quan trọng, decoded=%+v", decoded)
	}
	if decoded["transferAmount"] != webhook.TransferAmount {
		t.Fatalf("payload phải chứa transferAmount=%v, nhận được %v", webhook.TransferAmount, decoded["transferAmount"])
	}
	t.Logf("ToPayload đã serialize đầy đủ trường chính: id=%v gateway=%v content=%v transferAmount=%v", decoded["id"], decoded["gateway"], decoded["content"], decoded["transferAmount"])
}
