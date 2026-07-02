package business

import (
	"context"
	"encoding/json"
	"errors"
	"net"
	"reflect"
	"strings"
	"testing"
	"unsafe"

	"payment-service/internal/module/payment/entity"
	grpcRepo "payment-service/internal/module/payment/repository/grpc"
	repository "payment-service/internal/module/payment/repository/postgres"
	pb "payment-service/proto/pb"

	"github.com/uptrace/bun"
	gogrpc "google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/test/bufconn"
)

type fakePaymentRepository struct {
	findByBookingIDResults map[string]*entity.Payment
	findByUUIDResults      map[string]*entity.Payment
	getByIDResults         map[string]*entity.Payment
	findByBookingErr       error
	findByUUIDErr          error
	getByIDErr             error
	createErr              error
	updateErr              error
	createdPayments        []*entity.Payment
	updateCalls            []paymentUpdateCall
}

type paymentUpdateCall struct {
	ID     string
	Fields map[string]interface{}
}

func (f *fakePaymentRepository) FindByContent(context.Context, string) (*entity.Payment, error) {
	return nil, nil
}

func (f *fakePaymentRepository) FindByBookingId(_ context.Context, bookingID string) (*entity.Payment, error) {
	if f.findByBookingErr != nil {
		return nil, f.findByBookingErr
	}
	if payment, ok := f.findByBookingIDResults[bookingID]; ok {
		return payment, nil
	}
	return nil, nil
}

func (f *fakePaymentRepository) FindByShortCode(context.Context, string) (*entity.Payment, error) {
	return nil, nil
}

func (f *fakePaymentRepository) FindByUUIDNoHyphens(_ context.Context, uuidNoHyphens string) (*entity.Payment, error) {
	if f.findByUUIDErr != nil {
		return nil, f.findByUUIDErr
	}
	if payment, ok := f.findByUUIDResults[uuidNoHyphens]; ok {
		return payment, nil
	}
	return nil, nil
}

func (f *fakePaymentRepository) UpdatePaymentFields(_ context.Context, _ bun.IDB, id string, fields map[string]interface{}) error {
	if f.updateErr != nil {
		return f.updateErr
	}

	clonedFields := make(map[string]interface{}, len(fields))
	for key, value := range fields {
		clonedFields[key] = value
	}
	f.updateCalls = append(f.updateCalls, paymentUpdateCall{
		ID:     id,
		Fields: clonedFields,
	})
	return nil
}

func (f *fakePaymentRepository) Create(_ context.Context, payment *entity.Payment) error {
	if f.createErr != nil {
		return f.createErr
	}
	f.createdPayments = append(f.createdPayments, payment)
	return nil
}

func (f *fakePaymentRepository) GetById(_ context.Context, id string) (*entity.Payment, error) {
	if f.getByIDErr != nil {
		return nil, f.getByIDErr
	}
	if payment, ok := f.getByIDResults[id]; ok {
		return payment, nil
	}
	return nil, nil
}

type fakePaymentOutboxServer struct {
	pb.UnimplementedOutboxServiceServer
	requests []*pb.CreateOutboxEventRequest
	createErr error
}

func (f *fakePaymentOutboxServer) CreateOutboxEvent(_ context.Context, req *pb.CreateOutboxEventRequest) (*pb.CreateOutboxEventResponse, error) {
	if f.createErr != nil {
		return nil, f.createErr
	}
	f.requests = append(f.requests, &pb.CreateOutboxEventRequest{
		EventType: req.GetEventType(),
		Payload:   req.GetPayload(),
	})
	return &pb.CreateOutboxEventResponse{Success: true, EventId: int32(len(f.requests))}, nil
}

func newTestPaymentOutboxClient(t *testing.T, server pb.OutboxServiceServer) *grpcRepo.OutboxClient {
	t.Helper()

	listener := bufconn.Listen(1024 * 1024)
	grpcServer := gogrpc.NewServer()
	pb.RegisterOutboxServiceServer(grpcServer, server)

	go func() {
		_ = grpcServer.Serve(listener)
	}()

	t.Cleanup(func() {
		grpcServer.Stop()
		_ = listener.Close()
	})

	conn, err := gogrpc.DialContext(
		context.Background(),
		"bufnet",
		gogrpc.WithContextDialer(func(context.Context, string) (net.Conn, error) {
			return listener.Dial()
		}),
		gogrpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		t.Fatalf("failed to create bufconn outbox client: %v", err)
	}

	t.Cleanup(func() {
		_ = conn.Close()
	})

	client := &grpcRepo.OutboxClient{}
	setUnexportedField(client, "conn", conn)
	setUnexportedField(client, "client", pb.NewOutboxServiceClient(conn))
	return client
}

func setUnexportedField(target any, fieldName string, value any) {
	field := reflect.ValueOf(target).Elem().FieldByName(fieldName)
	reflect.NewAt(field.Type(), unsafe.Pointer(field.UnsafeAddr())).Elem().Set(reflect.ValueOf(value))
}

func newTestPaymentBiz(repo repository.PaymentRepository, outboxClient *grpcRepo.OutboxClient) *paymentBiz {
	return &paymentBiz{
		repo:         repo,
		outboxClient: outboxClient,
	}
}

func TestPaymentBiz_CreatePayment(t *testing.T) {
	ctx := context.Background()

	t.Run("creates a new pending payment when no payment exists for the booking", func(t *testing.T) {
		// Test Case ID: TC-GO-PAY-011
		// Mục tiêu: CreatePayment must create a new PENDING payment when repository has no existing payment for booking.
		// Kiểm tra DB: repository side effect is verified via fake repository call capture (createdPayments length and payload).
		// Hoàn tác: no real DB mutation in this unit test; isolated fake repository state is recreated per test case.

		// Chuẩn bị: repository returns no existing payment for booking-1.
		repo := &fakePaymentRepository{
			findByBookingIDResults: map[string]*entity.Payment{},
		}

		// Thực thi: create a payment for booking-1.
		biz := newTestPaymentBiz(repo, nil)
		payment, err := biz.CreatePayment(ctx, "booking-1", 180000)

		// Xác nhận: service returns a new PENDING payment and calls Create exactly once.
		if err != nil {
			t.Fatalf("expected CreatePayment to succeed, got %v", err)
		}
		if payment == nil {
			t.Fatal("expected a new payment to be returned")
		}
		if payment.BookingId != "booking-1" || payment.Amount != 180000 || payment.Status != entity.PaymentStatusPending {
			t.Fatalf("unexpected payment returned: %+v", payment)
		}
		if len(repo.createdPayments) != 1 {
			t.Fatalf("expected exactly one repository create call, got %d", len(repo.createdPayments))
		}
		t.Logf("CreatePayment da tao payment id=%s booking_id=%s so_tien=%.0f trang_thai=%s", payment.Id, payment.BookingId, payment.Amount, payment.Status)
	})

	t.Run("returns the existing payment instead of creating a duplicate one", func(t *testing.T) {
		// Test Case ID: TC-GO-PAY-012
		// Mục tiêu: CreatePayment must be idempotent for existing booking payment and avoid duplicate Create call.
		// Kiểm tra DB: duplicate guard is verified by asserting no create calls against fake repository.
		// Hoàn tác: no shared mutable state; fresh fake repository per test.

		// Chuẩn bị: repository already has payment-1 for booking-1.
		existing := &entity.Payment{Id: "payment-1", BookingId: "booking-1", Amount: 180000, Status: entity.PaymentStatusPending}
		repo := &fakePaymentRepository{
			findByBookingIDResults: map[string]*entity.Payment{"booking-1": existing},
		}

		// Thực thi: attempt to create payment for the same booking.
		biz := newTestPaymentBiz(repo, nil)
		payment, err := biz.CreatePayment(ctx, "booking-1", 180000)

		// Xác nhận: existing payment is returned and no create call is issued.
		if err != nil {
			t.Fatalf("expected CreatePayment duplicate guard to succeed, got %v", err)
		}
		if payment != existing {
			t.Fatalf("expected existing payment pointer to be returned, got %+v", payment)
		}
		if len(repo.createdPayments) != 0 {
			t.Fatalf("expected no repository create call on duplicate guard, got %d", len(repo.createdPayments))
		}
		t.Logf("CreatePayment tra ve payment da ton tai id=%s va khong tao ban ghi trung", payment.Id)
	})

	t.Run("returns wrapped error when repository create fails", func(t *testing.T) {
		// Test Case ID: TC-GO-PAY-026
		// Mục tiêu: CreatePayment must wrap repository create errors for operational observability.
		repo := &fakePaymentRepository{
			findByBookingIDResults: map[string]*entity.Payment{},
			createErr:              errors.New("insert payment failed"),
		}

		biz := newTestPaymentBiz(repo, nil)
		payment, err := biz.CreatePayment(ctx, "booking-create-error", 200000)
		if err == nil {
			t.Fatal("expected wrapped create error from CreatePayment")
		}
		if !strings.Contains(err.Error(), "failed to create payment") {
			t.Fatalf("expected wrapped create error context, got %v", err)
		}
		if payment != nil {
			t.Fatalf("expected nil payment when create fails, got %+v", payment)
		}
		if len(repo.createdPayments) != 0 {
			t.Fatalf("expected no successful create call capture on create failure, got %d", len(repo.createdPayments))
		}
		t.Logf("CreatePayment tra ve loi tao moi dung nhu ky vong: %v", err)
	})
}

func TestPaymentBiz_ProcessSePayWebhook(t *testing.T) {
	ctx := context.Background()

	t.Run("completes payment when booking code and amount match", func(t *testing.T) {
		// Test Case ID: TC-GO-PAY-013
		// Mục tiêu: webhook with valid booking code + matching amount must update payment to COMPLETED and publish PAYMENT_COMPLETED outbox event.
		// Kiểm tra DB: local persistence contract is verified through UpdatePaymentFields call payload in fake repository.
		// Hoàn tác: no real DB transaction in this unit test; fake state is isolated.

		// Chuẩn bị: pending payment exists for extracted UUID and outbox server is active.
		outboxServer := &fakePaymentOutboxServer{}
		repo := &fakePaymentRepository{
			findByUUIDResults: map[string]*entity.Payment{
				"FFBEF88798BE46D9917B5D41747F0DC1": {
					Id:        "payment-1",
					BookingId: "booking-1",
					Amount:    180000,
					Status:    entity.PaymentStatusPending,
				},
			},
		}
		biz := newTestPaymentBiz(repo, newTestPaymentOutboxClient(t, outboxServer))

		webhook := &entity.SePayWebhook{
			Id:             123456,
			Content:        "QHFFBEF88798BE46D9917B5D41747F0DC1",
			Description:    "booking booking-1",
			TransferAmount: 180000,
		}

		// Thực thi: process webhook.
		if err := biz.ProcessSePayWebhook(ctx, webhook); err != nil {
			t.Fatalf("expected ProcessSePayWebhook happy path to succeed, got %v", err)
		}

		// Xác nhận: payment update fields include COMPLETED + BANK_TRANSFER.
		if len(repo.updateCalls) != 1 {
			t.Fatalf("expected one payment update call, got %d", len(repo.updateCalls))
		}
		update := repo.updateCalls[0]
		if update.ID != "payment-1" {
			t.Fatalf("expected payment-1 to be updated, got %+v", update)
		}
		if update.Fields["status"] != entity.PaymentStatusCompleted {
			t.Fatalf("expected status COMPLETED in update fields, got %+v", update.Fields)
		}
		if update.Fields["payment_method"] != entity.PaymentMethodBankTransfer {
			t.Fatalf("expected BANK_TRANSFER method in update fields, got %+v", update.Fields)
		}
		t.Logf("ProcessSePayWebhook da cap nhat payment id=%s trang_thai=%v phuong_thuc=%v", update.ID, update.Fields["status"], update.Fields["payment_method"])

		// Xác nhận: outbox event PAYMENT_COMPLETED is emitted exactly once.
		if len(outboxServer.requests) != 1 {
			t.Fatalf("expected one outbox event, got %d", len(outboxServer.requests))
		}
		if outboxServer.requests[0].GetEventType() != string(entity.EventTypePaymentCompleted) {
			t.Fatalf("expected PAYMENT_COMPLETED event type, got %q", outboxServer.requests[0].GetEventType())
		}

		var payload map[string]interface{}
		if err := json.Unmarshal([]byte(outboxServer.requests[0].GetPayload()), &payload); err != nil {
			t.Fatalf("failed to decode outbox payload: %v", err)
		}
		if payload["payment_id"] != "payment-1" || payload["booking_id"] != "booking-1" {
			t.Fatalf("unexpected outbox payload: %+v", payload)
		}
		if payload["payment_method"] != string(entity.PaymentMethodBankTransfer) {
			t.Fatalf("expected BANK_TRANSFER in outbox payload, got %+v", payload)
		}
		t.Logf("ProcessSePayWebhook da phat su kien outbox loai=%s payload_payment_id=%v payload_booking_id=%v", outboxServer.requests[0].GetEventType(), payload["payment_id"], payload["booking_id"])
	})

	t.Run("returns an extraction error when no booking uuid can be found", func(t *testing.T) {
		// Test Case ID: TC-GO-PAY-014
		// Mục tiêu: webhook without valid booking code must fail fast before repository update.

		// Chuẩn bị: empty fake repository and invalid webhook content.
		repo := &fakePaymentRepository{}
		biz := newTestPaymentBiz(repo, nil)

		// Thực thi: process invalid webhook payload.
		err := biz.ProcessSePayWebhook(ctx, &entity.SePayWebhook{
			Id:             1,
			Content:        "payment completed",
			Description:    "no booking code here",
			TransferAmount: 180000,
		})

		// Xác nhận: extraction error is returned and no payment update occurs.
		if err == nil {
			t.Fatal("expected ProcessSePayWebhook to fail when uuid extraction fails")
		}
		if !strings.Contains(err.Error(), "failed to extract booking UUID") {
			t.Fatalf("expected extraction error, got %v", err)
		}
		if len(repo.updateCalls) != 0 {
			t.Fatalf("expected no update call after extraction failure, got %d", len(repo.updateCalls))
		}
		t.Logf("ProcessSePayWebhook tu choi noi_dung_khong_hop_le voi loi=%v", err)
	})

	t.Run("treats the same transaction id as idempotent", func(t *testing.T) {
		// Test Case ID: TC-GO-PAY-015
		// Mục tiêu: duplicate webhook retry with same transaction_id must return nil and skip update/outbox.

		// Chuẩn bị: existing payment already stores transaction_id=123456.
		transactionID := "123456"
		repo := &fakePaymentRepository{
			findByUUIDResults: map[string]*entity.Payment{
				"FFBEF88798BE46D9917B5D41747F0DC1": {
					Id:            "payment-1",
					BookingId:     "booking-1",
					Amount:        180000,
					Status:        entity.PaymentStatusPending,
					TransactionId: &transactionID,
				},
			},
		}
		biz := newTestPaymentBiz(repo, nil)

		// Thực thi: process same transaction again.
		err := biz.ProcessSePayWebhook(ctx, &entity.SePayWebhook{
			Id:             123456,
			Content:        "QHFFBEF88798BE46D9917B5D41747F0DC1",
			Description:    "duplicate webhook",
			TransferAmount: 180000,
		})

		// Xác nhận: no-op idempotent behavior.
		if err != nil {
			t.Fatalf("expected idempotent webhook to return nil, got %v", err)
		}
		if len(repo.updateCalls) != 0 {
			t.Fatalf("expected no update on idempotent webhook, got %d", len(repo.updateCalls))
		}
		t.Logf("ProcessSePayWebhook xu ly transaction_id=%s theo nhanh idempotent retry", transactionID)
	})

	t.Run("rejects a different transaction when the payment is already completed", func(t *testing.T) {
		// Test Case ID: TC-GO-PAY-016
		// Mục tiêu: completed payment must reject webhook with a different transaction id to prevent overwrite.

		// Chuẩn bị: payment is already COMPLETED with transaction_id=111111.
		transactionID := "111111"
		repo := &fakePaymentRepository{
			findByUUIDResults: map[string]*entity.Payment{
				"FFBEF88798BE46D9917B5D41747F0DC1": {
					Id:            "payment-1",
					BookingId:     "booking-1",
					Amount:        180000,
					Status:        entity.PaymentStatusCompleted,
					TransactionId: &transactionID,
				},
			},
		}
		biz := newTestPaymentBiz(repo, nil)

		// Thực thi: process webhook with different transaction id=123456.
		err := biz.ProcessSePayWebhook(ctx, &entity.SePayWebhook{
			Id:             123456,
			Content:        "QHFFBEF88798BE46D9917B5D41747F0DC1",
			Description:    "different transaction",
			TransferAmount: 180000,
		})

		// Xác nhận: guard error is returned.
		if err == nil {
			t.Fatal("expected completed payment with a different transaction to fail")
		}
		if !strings.Contains(err.Error(), "payment already completed with different transaction") {
			t.Fatalf("expected completed payment error, got %v", err)
		}
		t.Logf("ProcessSePayWebhook chan giao dich xung dot: existing=%s incoming=%d err=%v", transactionID, 123456, err)
	})

	t.Run("rejects webhook when the received amount does not match the payment amount", func(t *testing.T) {
		// Test Case ID: TC-GO-PAY-017
		// Mục tiêu: amount mismatch must fail and skip payment update.

		// Chuẩn bị: pending payment expects 180000, webhook sends 100000.
		repo := &fakePaymentRepository{
			findByUUIDResults: map[string]*entity.Payment{
				"FFBEF88798BE46D9917B5D41747F0DC1": {
					Id:        "payment-1",
					BookingId: "booking-1",
					Amount:    180000,
					Status:    entity.PaymentStatusPending,
				},
			},
		}
		biz := newTestPaymentBiz(repo, nil)

		// Thực thi: process mismatched amount webhook.
		err := biz.ProcessSePayWebhook(ctx, &entity.SePayWebhook{
			Id:             123456,
			Content:        "QHFFBEF88798BE46D9917B5D41747F0DC1",
			Description:    "amount mismatch",
			TransferAmount: 100000,
		})

		// Xác nhận: mismatch error and no persistence mutation.
		if err == nil {
			t.Fatal("expected amount mismatch to fail")
		}
		if !strings.Contains(err.Error(), "amount mismatch") {
			t.Fatalf("expected amount mismatch error, got %v", err)
		}
		if len(repo.updateCalls) != 0 {
			t.Fatalf("expected no update call on amount mismatch, got %d", len(repo.updateCalls))
		}
		t.Logf("ProcessSePayWebhook tu choi giao dich lech so tien voi loi=%v", err)
	})

	t.Run("returns payment-not-found error when repository cannot resolve UUID", func(t *testing.T) {
		// Test Case ID: TC-GO-PAY-027
		// Mục tiêu: ProcessSePayWebhook must fail when payment lookup by UUID does not return a payment.
		repo := &fakePaymentRepository{
			findByUUIDResults: map[string]*entity.Payment{},
		}
		biz := newTestPaymentBiz(repo, nil)

		err := biz.ProcessSePayWebhook(ctx, &entity.SePayWebhook{
			Id:             222333,
			Content:        "QHFFBEF88798BE46D9917B5D41747F0DC1",
			Description:    "missing payment",
			TransferAmount: 180000,
		})
		if err == nil {
			t.Fatal("expected payment-not-found error when UUID lookup misses")
		}
		if !strings.Contains(err.Error(), "payment not found with UUID") {
			t.Fatalf("expected payment-not-found message, got %v", err)
		}
		if len(repo.updateCalls) != 0 {
			t.Fatalf("expected no payment update when lookup fails, got %d", len(repo.updateCalls))
		}
		t.Logf("ProcessSePayWebhook tra ve loi tim kiem dung nhu ky vong: %v", err)
	})

	t.Run("returns update error when repository update fails after validation succeeds", func(t *testing.T) {
		// Test Case ID: TC-GO-PAY-028
		// Mục tiêu: ProcessSePayWebhook must propagate UpdatePaymentFields errors and skip outbox publish.
		outboxServer := &fakePaymentOutboxServer{}
		repo := &fakePaymentRepository{
			findByUUIDResults: map[string]*entity.Payment{
				"FFBEF88798BE46D9917B5D41747F0DC1": {
					Id:        "payment-update-error",
					BookingId: "booking-update-error",
					Amount:    180000,
					Status:    entity.PaymentStatusPending,
				},
			},
			updateErr: errors.New("update payment write blocked"),
		}
		biz := newTestPaymentBiz(repo, newTestPaymentOutboxClient(t, outboxServer))

		err := biz.ProcessSePayWebhook(ctx, &entity.SePayWebhook{
			Id:             777888,
			Content:        "QHFFBEF88798BE46D9917B5D41747F0DC1",
			Description:    "update fail",
			TransferAmount: 180000,
		})
		if err == nil {
			t.Fatal("expected update error from ProcessSePayWebhook")
		}
		if !strings.Contains(err.Error(), "update payment write blocked") {
			t.Fatalf("expected update repository error, got %v", err)
		}
		if len(outboxServer.requests) != 0 {
			t.Fatalf("expected no outbox event when update fails, got %d", len(outboxServer.requests))
		}
		t.Logf("ProcessSePayWebhook tra ve loi cap nhat dung nhu ky vong truoc buoc phat outbox: %v", err)
	})
}

func TestPaymentBiz_ConfirmPayment(t *testing.T) {
	ctx := context.Background()

	t.Run("confirms a pending payment and emits a payment completed outbox event", func(t *testing.T) {
		// Test Case ID: TC-GO-PAY-018
		// Mục tiêu: ConfirmPayment must update PENDING -> COMPLETED and publish PAYMENT_COMPLETED.
		// Kiểm tra DB: update payload is verified via repository call capture.
		// Hoàn tác: no real DB writes; fake repository is isolated.

		// Chuẩn bị: payment-1 is pending and outbox fake server is available.
		outboxServer := &fakePaymentOutboxServer{}
		repo := &fakePaymentRepository{
			getByIDResults: map[string]*entity.Payment{
				"payment-1": {
					Id:        "payment-1",
					BookingId: "booking-1",
					Amount:    180000,
					Status:    entity.PaymentStatusPending,
				},
			},
		}
		biz := newTestPaymentBiz(repo, newTestPaymentOutboxClient(t, outboxServer))

		// Thực thi: confirm payment with CASH method.
		if err := biz.ConfirmPayment(ctx, "payment-1", entity.PaymentMethodCash); err != nil {
			t.Fatalf("expected ConfirmPayment to succeed, got %v", err)
		}

		// Xác nhận: payment update payload is correct.
		if len(repo.updateCalls) != 1 {
			t.Fatalf("expected one update call, got %d", len(repo.updateCalls))
		}
		update := repo.updateCalls[0]
		if update.ID != "payment-1" || update.Fields["status"] != entity.PaymentStatusCompleted || update.Fields["payment_method"] != entity.PaymentMethodCash {
			t.Fatalf("unexpected confirm update payload: %+v", update)
		}
		t.Logf("ConfirmPayment da cap nhat payment id=%s trang_thai=%v phuong_thuc=%v", update.ID, update.Fields["status"], update.Fields["payment_method"])

		// Xác nhận: one PAYMENT_COMPLETED outbox event is emitted.
		if len(outboxServer.requests) != 1 {
			t.Fatalf("expected one outbox request, got %d", len(outboxServer.requests))
		}
		if outboxServer.requests[0].GetEventType() != string(entity.EventTypePaymentCompleted) {
			t.Fatalf("expected PAYMENT_COMPLETED event type, got %q", outboxServer.requests[0].GetEventType())
		}
		var payload map[string]interface{}
		if err := json.Unmarshal([]byte(outboxServer.requests[0].GetPayload()), &payload); err != nil {
			t.Fatalf("failed to decode ConfirmPayment outbox payload: %v", err)
		}
		if payload["payment_id"] != "payment-1" || payload["booking_id"] != "booking-1" {
			t.Fatalf("unexpected ConfirmPayment outbox payload identifiers: %+v", payload)
		}
		if payload["payment_method"] != string(entity.PaymentMethodCash) {
			t.Fatalf("expected CASH in ConfirmPayment outbox payload, got %+v", payload)
		}
		t.Logf("ConfirmPayment da phat su kien outbox loai=%s payload_payment_id=%v payload_booking_id=%v", outboxServer.requests[0].GetEventType(), payload["payment_id"], payload["booking_id"])
	})

	t.Run("returns nil when the payment is already completed", func(t *testing.T) {
		// Test Case ID: TC-GO-PAY-019
		// Mục tiêu: ConfirmPayment should be idempotent when payment already COMPLETED.

		// Chuẩn bị: payment-1 already completed.
		repo := &fakePaymentRepository{
			getByIDResults: map[string]*entity.Payment{
				"payment-1": {
					Id:        "payment-1",
					BookingId: "booking-1",
					Amount:    180000,
					Status:    entity.PaymentStatusCompleted,
				},
			},
		}
		biz := newTestPaymentBiz(repo, nil)

		// Act + Assert: method returns nil and performs no update.
		if err := biz.ConfirmPayment(ctx, "payment-1", entity.PaymentMethodCash); err != nil {
			t.Fatalf("expected completed payment guard to return nil, got %v", err)
		}
		if len(repo.updateCalls) != 0 {
			t.Fatalf("expected no update for already-completed payment, got %d", len(repo.updateCalls))
		}
		t.Logf("ConfirmPayment bo qua cap nhat voi payment da COMPLETED id=payment-1")
	})

	t.Run("returns wrapped error when payment lookup by id fails", func(t *testing.T) {
		// Test Case ID: TC-GO-PAY-029
		// Mục tiêu: ConfirmPayment must wrap GetById errors as payment-not-found context.
		repo := &fakePaymentRepository{
			getByIDErr: errors.New("database timeout"),
		}
		biz := newTestPaymentBiz(repo, nil)

		err := biz.ConfirmPayment(ctx, "payment-lookup-error", entity.PaymentMethodCash)
		if err == nil {
			t.Fatal("expected payment lookup error from ConfirmPayment")
		}
		if !strings.Contains(err.Error(), "payment not found") {
			t.Fatalf("expected wrapped payment-not-found context, got %v", err)
		}
		t.Logf("ConfirmPayment tra ve loi tim kiem dung nhu ky vong: %v", err)
	})

	t.Run("returns business error when payment status is neither pending nor completed", func(t *testing.T) {
		// Test Case ID: TC-GO-PAY-030
		// Mục tiêu: ConfirmPayment must reject invalid status transitions.
		repo := &fakePaymentRepository{
			getByIDResults: map[string]*entity.Payment{
				"payment-invalid-status": {
					Id:        "payment-invalid-status",
					BookingId: "booking-invalid-status",
					Amount:    150000,
					Status:    entity.PaymentStatusFailed,
				},
			},
		}
		biz := newTestPaymentBiz(repo, nil)

		err := biz.ConfirmPayment(ctx, "payment-invalid-status", entity.PaymentMethodCash)
		if err == nil {
			t.Fatal("expected invalid-status error from ConfirmPayment")
		}
		if !strings.Contains(err.Error(), "cannot confirm payment with status FAILED") {
			t.Fatalf("expected invalid status message, got %v", err)
		}
		if len(repo.updateCalls) != 0 {
			t.Fatalf("expected no update call on invalid status, got %d", len(repo.updateCalls))
		}
		t.Logf("ConfirmPayment tu choi chuyen trang thai khong hop le voi loi=%v", err)
	})

	t.Run("returns wrapped error when repository update fails for pending payment", func(t *testing.T) {
		// Test Case ID: TC-GO-PAY-031
		// Mục tiêu: ConfirmPayment must wrap UpdatePaymentFields errors.
		repo := &fakePaymentRepository{
			getByIDResults: map[string]*entity.Payment{
				"payment-update-error": {
					Id:        "payment-update-error",
					BookingId: "booking-update-error",
					Amount:    210000,
					Status:    entity.PaymentStatusPending,
				},
			},
			updateErr: errors.New("update payment failed"),
		}
		biz := newTestPaymentBiz(repo, nil)

		err := biz.ConfirmPayment(ctx, "payment-update-error", entity.PaymentMethodCash)
		if err == nil {
			t.Fatal("expected wrapped update error from ConfirmPayment")
		}
		if !strings.Contains(err.Error(), "failed to update payment") {
			t.Fatalf("expected wrapped update context, got %v", err)
		}
		t.Logf("ConfirmPayment tra ve loi cap nhat dung nhu ky vong: %v", err)
	})

	t.Run("returns outbox error after payment update succeeds", func(t *testing.T) {
		// Test Case ID: TC-GO-PAY-032
		// Mục tiêu: ConfirmPayment must propagate outbox publish failure after local update succeeds.
		outboxServer := &fakePaymentOutboxServer{
			createErr: errors.New("outbox unavailable"),
		}
		repo := &fakePaymentRepository{
			getByIDResults: map[string]*entity.Payment{
				"payment-outbox-error": {
					Id:        "payment-outbox-error",
					BookingId: "booking-outbox-error",
					Amount:    220000,
					Status:    entity.PaymentStatusPending,
				},
			},
		}
		biz := newTestPaymentBiz(repo, newTestPaymentOutboxClient(t, outboxServer))

		err := biz.ConfirmPayment(ctx, "payment-outbox-error", entity.PaymentMethodCash)
		if err == nil {
			t.Fatal("expected outbox publish error from ConfirmPayment")
		}
		if !strings.Contains(err.Error(), "outbox unavailable") {
			t.Fatalf("expected outbox error message, got %v", err)
		}
		if len(repo.updateCalls) != 1 {
			t.Fatalf("expected payment update to succeed before outbox error, got %d update call(s)", len(repo.updateCalls))
		}
		t.Logf("ConfirmPayment tra ve loi outbox sau khi cap nhat thanh cong: %v", err)
	})
}
