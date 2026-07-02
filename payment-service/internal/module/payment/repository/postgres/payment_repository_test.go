package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"testing"
	"time"

	"payment-service/internal/module/payment/entity"

	_ "github.com/mattn/go-sqlite3"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
)

func TestPaymentRepository_FindByUUIDNoHyphens(t *testing.T) {
	ctx := context.Background()

	t.Run("finds payment by booking id without hyphens and ignores case", func(t *testing.T) {
		// Test Case ID: TC-GO-DB-020
		// Mục tiêu: FindByUUIDNoHyphens must match booking_id after removing '-' and normalizing case.
		// Kiểm tra DB: verify pre-state row count, query result, and post-state row count.
		// Hoàn tác: use isolated seed row and deterministic cleanup in defer.
		db := newSQLitePaymentDB(t)
		repo := NewPaymentRepository(db).(*paymentRepository)

		seeded := &entity.Payment{
			Id:          "payment-uuid-no-hyphens",
			BookingId:   "d15b3598-5f49-488e-a0c3-454f12885f8e",
			Amount:      12000.25,
			PaymentDate: time.Date(2026, 4, 18, 9, 0, 0, 0, time.UTC),
			Status:      entity.PaymentStatusPending,
			CreatedAt:   time.Date(2026, 4, 18, 9, 0, 0, 0, time.UTC),
		}

		preCount, err := db.NewSelect().Model((*entity.Payment)(nil)).Count(ctx)
		if err != nil {
			t.Fatalf("failed to capture pre-state payment count: %v", err)
		}
		if _, err := db.NewInsert().Model(seeded).Exec(ctx); err != nil {
			t.Fatalf("failed to seed payment row: %v", err)
		}
		defer func() {
			_, _ = db.NewDelete().Model((*entity.Payment)(nil)).Where("id = ?", seeded.Id).Exec(ctx)
		}()

		payment, err := repo.FindByUUIDNoHyphens(ctx, "D15B35985F49488EA0C3454F12885F8E")
		if err != nil {
			t.Fatalf("expected FindByUUIDNoHyphens to succeed, got %v", err)
		}
		if payment == nil {
			t.Fatal("expected payment to be returned")
		}
		if payment.Id != seeded.Id || payment.BookingId != seeded.BookingId {
			t.Fatalf("unexpected payment returned: %+v", payment)
		}

		postCount, err := db.NewSelect().Model((*entity.Payment)(nil)).Count(ctx)
		if err != nil {
			t.Fatalf("failed to capture post-state payment count: %v", err)
		}
		if preCount+1 != postCount {
			t.Fatalf("expected exactly one seeded row in DB during test, pre=%d post=%d", preCount, postCount)
		}

		t.Logf("FindByUUIDNoHyphens da tim thay payment_id=%s booking_id=%s voi uuidNoHyphens viet hoa", payment.Id, payment.BookingId)
	})

	t.Run("returns not-found error when uuid without hyphens does not match any booking", func(t *testing.T) {
		// Test Case ID: TC-GO-DB-033
		// Mục tiêu: FindByUUIDNoHyphens must return not-found error when no booking_id matches uuidNoHyphens.
		// Kiểm tra DB: verify pre/post row count unchanged for read-only miss query.
		// Hoàn tác: no write operation; database remains unchanged.
		db := newSQLitePaymentDB(t)
		repo := NewPaymentRepository(db).(*paymentRepository)

		preCount, err := db.NewSelect().Model((*entity.Payment)(nil)).Count(ctx)
		if err != nil {
			t.Fatalf("failed to capture pre-state payment count: %v", err)
		}

		_, lookupErr := repo.FindByUUIDNoHyphens(ctx, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
		if lookupErr == nil {
			t.Fatal("expected not-found error for unknown uuidNoHyphens")
		}
		if !strings.Contains(lookupErr.Error(), "payment not found with UUID (no hyphens)") {
			t.Fatalf("expected not-found error context, got %v", lookupErr)
		}

		postCount, err := db.NewSelect().Model((*entity.Payment)(nil)).Count(ctx)
		if err != nil {
			t.Fatalf("failed to capture post-state payment count: %v", err)
		}
		if preCount != postCount {
			t.Fatalf("expected read-only miss query to keep row count unchanged, pre=%d post=%d", preCount, postCount)
		}

		t.Logf("FindByUUIDNoHyphens tra ve loi not-found dung nhu ky vong voi uuidNoHyphens khong ton tai: %v", lookupErr)
	})
}

func TestPaymentRepository_UpdatePaymentFields(t *testing.T) {
	ctx := context.Background()

	t.Run("updates only provided business fields and skips updated_at inside loop", func(t *testing.T) {
		// Test Case ID: TC-GO-DB-021
		// Mục tiêu: UpdatePaymentFields must update status/payment_method/transaction_id and ignore updated_at field in the loop.
		// Kiểm tra DB: verify pre-state snapshot and exact post-state changes for target + unaffected row.
		// Hoàn tác: run inside transaction and rollback in defer.
		db := newSQLitePaymentDB(t)
		repo := NewPaymentRepository(db).(*paymentRepository)
		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			t.Fatalf("failed to begin transaction: %v", err)
		}
		defer func() {
			_ = tx.Rollback()
		}()

		target := &entity.Payment{
			Id:            "payment-update-target",
			BookingId:     "booking-update-target",
			Amount:        20000.75,
			PaymentDate:   time.Date(2026, 4, 18, 10, 0, 0, 0, time.UTC),
			Status:        entity.PaymentStatusPending,
			PaymentMethod: entity.PaymentMethodCash,
			CreatedAt:     time.Date(2026, 4, 18, 10, 0, 0, 0, time.UTC),
		}
		other := &entity.Payment{
			Id:            "payment-update-other",
			BookingId:     "booking-update-other",
			Amount:        21000.5,
			PaymentDate:   time.Date(2026, 4, 18, 10, 5, 0, 0, time.UTC),
			Status:        entity.PaymentStatusPending,
			PaymentMethod: entity.PaymentMethodCash,
			CreatedAt:     time.Date(2026, 4, 18, 10, 5, 0, 0, time.UTC),
		}
		if _, err := tx.NewInsert().Model(target).Exec(ctx); err != nil {
			t.Fatalf("failed to seed target payment: %v", err)
		}
		if _, err := tx.NewInsert().Model(other).Exec(ctx); err != nil {
			t.Fatalf("failed to seed control payment: %v", err)
		}

		preTarget := new(entity.Payment)
		if err := tx.NewSelect().Model(preTarget).Where("id = ?", target.Id).Scan(ctx); err != nil {
			t.Fatalf("failed to capture pre-state target payment: %v", err)
		}
		preOther := new(entity.Payment)
		if err := tx.NewSelect().Model(preOther).Where("id = ?", other.Id).Scan(ctx); err != nil {
			t.Fatalf("failed to capture pre-state control payment: %v", err)
		}

		txID := "tx-999100"
		updateTime := time.Date(2026, 4, 18, 10, 30, 0, 0, time.UTC)
		fields := map[string]interface{}{
			"status":         entity.PaymentStatusCompleted,
			"payment_method": entity.PaymentMethodBankTransfer,
			"transaction_id": txID,
			"updated_at":     updateTime,
		}

		if err := repo.UpdatePaymentFields(ctx, tx, target.Id, fields); err != nil {
			t.Fatalf("expected UpdatePaymentFields to succeed, got %v", err)
		}

		postTarget := new(entity.Payment)
		if err := tx.NewSelect().Model(postTarget).Where("id = ?", target.Id).Scan(ctx); err != nil {
			t.Fatalf("failed to load post-state target payment: %v", err)
		}
		postOther := new(entity.Payment)
		if err := tx.NewSelect().Model(postOther).Where("id = ?", other.Id).Scan(ctx); err != nil {
			t.Fatalf("failed to load post-state control payment: %v", err)
		}

		if postTarget.Status != entity.PaymentStatusCompleted {
			t.Fatalf("expected target status COMPLETED, got %s", postTarget.Status)
		}
		if postTarget.PaymentMethod != entity.PaymentMethodBankTransfer {
			t.Fatalf("expected target payment_method BANK_TRANSFER, got %s", postTarget.PaymentMethod)
		}
		if postTarget.TransactionId == nil || *postTarget.TransactionId != txID {
			t.Fatalf("expected target transaction_id=%s, got %+v", txID, postTarget.TransactionId)
		}
		if postTarget.UpdatedAt != nil {
			t.Fatalf("expected updated_at to remain unchanged (nil) when passed via fields loop, got %v", postTarget.UpdatedAt)
		}

		if postOther.Status != preOther.Status || postOther.PaymentMethod != preOther.PaymentMethod {
			t.Fatalf("expected control payment to remain unchanged, before=%+v after=%+v", preOther, postOther)
		}
		if postOther.TransactionId != nil {
			t.Fatalf("expected control payment transaction_id to remain nil, got %+v", postOther.TransactionId)
		}
		if preTarget.Status == postTarget.Status {
			t.Fatalf("expected target status to change from pre-state, pre=%s post=%s", preTarget.Status, postTarget.Status)
		}

		t.Logf("UpdatePaymentFields da cap nhat payment muc tieu id=%s trang_thai=%s phuong_thuc=%s transaction_id=%s va giu updated_at la nil", postTarget.Id, postTarget.Status, postTarget.PaymentMethod, *postTarget.TransactionId)
	})
}

func newSQLitePaymentDB(t *testing.T) *bun.DB {
	t.Helper()

	safeName := strings.NewReplacer("/", "_", " ", "_").Replace(t.Name())
	dsn := fmt.Sprintf("file:payment_repo_test_%s_%d?mode=memory&cache=shared", safeName, time.Now().UnixNano())
	sqlDB, err := sql.Open("sqlite3", dsn)
	if err != nil {
		t.Fatalf("failed to open sqlite db: %v", err)
	}

	db := bun.NewDB(sqlDB, sqlitedialect.New())
	if _, err := db.NewCreateTable().Model((*entity.Payment)(nil)).IfNotExists().Exec(context.Background()); err != nil {
		_ = sqlDB.Close()
		t.Fatalf("failed to create payments table: %v", err)
	}

	t.Cleanup(func() {
		_ = db.Close()
	})

	return db
}
