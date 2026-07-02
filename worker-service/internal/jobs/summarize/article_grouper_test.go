package summarize

import (
	"testing"

	"worker-service/internal/models"
)

func TestGroupArticles(t *testing.T) {
	t.Run("tra_ve_nil_khi_danh_sach_bai_viet_rong", func(t *testing.T) {
		// Test Case ID: TC-GO-WORK-025
		// Mục tiêu: GroupArticles trả về nil khi đầu vào rỗng.
		// Kiểm tra DB: N.
		// Hoàn tác: N.
		if groups := GroupArticles(nil); groups != nil {
			t.Fatalf("mong muốn trả về nil với đầu vào rỗng, nhận được %+v", groups)
		}
		t.Logf("GroupArticles trả về nil đúng như kỳ vọng với danh sách rỗng")
	})

	t.Run("tao_nhom_1_1_va_giu_nguyen_category_language", func(t *testing.T) {
		// Test Case ID: TC-GO-WORK-025 (nhánh dữ liệu có phần tử)
		// Mục tiêu: Input có dữ liệu tạo số nhóm tương ứng số article, giữ nguyên category/language.
		articles := []*models.NewsArticle{
			{Id: "a1", Category: "movie", Language: "vi"},
			{Id: "a2", Category: "tech", Language: "en"},
		}
		groups := GroupArticles(articles)
		if len(groups) != 2 {
			t.Fatalf("mong muốn 2 nhóm, nhận được %d", len(groups))
		}
		if groups[0].Category != "movie" || groups[0].Language != "vi" {
			t.Fatalf("nhóm đầu tiên không đúng category/language, nhận được %+v", groups[0])
		}
		if len(groups[1].Articles) != 1 || groups[1].Articles[0].Id != "a2" {
			t.Fatalf("nhóm thứ hai không đúng dữ liệu article, nhận được %+v", groups[1])
		}
		t.Logf("GroupArticles đã tạo %d nhóm và giữ nguyên category/language theo từng bài viết", len(groups))
	})
}
