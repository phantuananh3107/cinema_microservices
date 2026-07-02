package business

import (
	"context"
	"fmt"
	"time"

	"payment-service/internal/module/payment/entity"
	grpcRepo "payment-service/internal/module/payment/repository/grpc"
	repository "payment-service/internal/module/payment/repository/postgres"
	"payment-service/internal/module/payment/service"
	"payment-service/internal/pkg/pubsub"

	"github.com/google/uuid"
	"github.com/samber/do"
	"github.com/uptrace/bun"
)

type PaymentBiz interface {
	CreatePayment(ctx context.Context, bookingId string, amount float64) (*entity.Payment, error)
	GetPaymentByBookingId(ctx context.Context, bookingId string) (*entity.Payment, error)
	ProcessSePayWebhook(ctx context.Context, webhook *entity.SePayWebhook) error
	VerifyCryptoPayment(ctx context.Context, req *entity.CryptoVerificationRequest) error
	ConfirmPayment(ctx context.Context, paymentId string, paymentMethod entity.PaymentMethod) error
}

type paymentBiz struct {
	container         *do.Injector
	db                *bun.DB
	repo              repository.PaymentRepository
	outboxClient      *grpcRepo.OutboxClient
	blockchainService service.BlockchainService
	pubsub            pubsub.PubSub
}

func NewPaymentBiz(i *do.Injector) (PaymentBiz, error) {
	db, err := do.Invoke[*bun.DB](i)
	if err != nil {
		return nil, err
	}

	repo, err := do.Invoke[repository.PaymentRepository](i)
	if err != nil {
		return nil, err
	}

	outboxClient, err := do.Invoke[*grpcRepo.OutboxClient](i)
	if err != nil {
		return nil, err
	}

	pubsubClient, err := do.Invoke[pubsub.PubSub](i)
	if err != nil {
		return nil, err
	}

	blockchainService, err := service.NewBlockchainService()
	if err != nil {
		return nil, err
	}

	return &paymentBiz{
		container:         i,
		db:                db,
		repo:              repo,
		outboxClient:      outboxClient,
		blockchainService: blockchainService,
		pubsub:            pubsubClient,
	}, nil
}

func (b *paymentBiz) CreatePayment(ctx context.Context, bookingId string, amount float64) (*entity.Payment, error) {
	existingPayment, _ := b.repo.FindByBookingId(ctx, bookingId)
	if existingPayment != nil {
		return existingPayment, nil
	}

	payment := &entity.Payment{
		Id:          uuid.New().String(),
		BookingId:   bookingId,
		Amount:      amount,
		PaymentDate: time.Now(),
		Status:      entity.PaymentStatusPending,
		CreatedAt:   time.Now(),
	}

	err := b.repo.Create(ctx, payment)
	if err != nil {
		return nil, fmt.Errorf("failed to create payment: %w", err)
	}

	return payment, nil
}

func (b *paymentBiz) GetPaymentByBookingId(ctx context.Context, bookingId string) (*entity.Payment, error) {
	return b.repo.FindByBookingId(ctx, bookingId)
}

func (b *paymentBiz) ProcessSePayWebhook(ctx context.Context, webhook *entity.SePayWebhook) error {
	uuidNoHyphens := b.extractUUIDNoHyphens(webhook.Content, webhook.Description)
	if uuidNoHyphens == "" {
		return fmt.Errorf("failed to extract booking UUID from webhook content: %s", webhook.Content)
	}

	transactionId := fmt.Sprintf("%d", webhook.Id)

	payment, err := b.repo.FindByUUIDNoHyphens(ctx, uuidNoHyphens)
	if err != nil || payment == nil {
		return fmt.Errorf("payment not found with UUID (no hyphens) %s", uuidNoHyphens)
	}

	// Check idempotency: if already processed this transaction
	if payment.TransactionId != nil && *payment.TransactionId == transactionId {
		return nil
	}

	if payment.Status == entity.PaymentStatusCompleted {
		return fmt.Errorf("payment already completed with different transaction")
	}

	if webhook.TransferAmount != payment.Amount {
		return fmt.Errorf("amount mismatch: expected %.2f, got %.2f", payment.Amount, webhook.TransferAmount)
	}

	payload, err := webhook.ToPayload()
	if err != nil {
		return fmt.Errorf("failed to marshal webhook payload: %w", err)
	}

	eventData := map[string]interface{}{
		"payment_id":     payment.Id,
		"booking_id":     payment.BookingId,
		"amount":         payment.Amount,
		"status":         entity.PaymentStatusCompleted,
		"payment_method": entity.PaymentMethodBankTransfer,
		"transaction_id": transactionId,
		"timestamp":      time.Now().Unix(),
	}

	fields := map[string]interface{}{
		"transaction_id": transactionId,
		"payload":        payload,
		"status":         entity.PaymentStatusCompleted,
		"payment_method": entity.PaymentMethodBankTransfer,
		"updated_at":     time.Now(),
	}

	if err = b.repo.UpdatePaymentFields(ctx, b.db, payment.Id, fields); err != nil {
		return err
	}

	return b.outboxClient.CreateOutboxEvent(ctx, string(entity.EventTypePaymentCompleted), eventData)
}

func (b *paymentBiz) VerifyCryptoPayment(ctx context.Context, req *entity.CryptoVerificationRequest) error {
	if err := b.blockchainService.VerifyTransaction(ctx, req.TxHash, req.FromAddress, req.ToAddress, req.AmountEth); err != nil {
		return fmt.Errorf("blockchain verification failed: %w", err)
	}

	payment, err := b.repo.FindByBookingId(ctx, req.BookingId)
	if err != nil {
		return err
	}

	_ = b.repo.UpdatePaymentFields(ctx, b.db, payment.Id, map[string]interface{}{
		"transaction_id": req.TxHash,
		"payment_method": entity.PaymentMethodCryptoCurrency,
		"status":         entity.PaymentStatusCompleted,
		"updated_at":     time.Now(),
	})

	return b.outboxClient.CreateOutboxEvent(ctx, string(entity.EventTypePaymentCompleted), map[string]interface{}{
		"payment_id":     payment.Id,
		"booking_id":     req.BookingId,
		"amount":         req.AmountVnd,
		"payment_method": entity.PaymentMethodCryptoCurrency,
		"tx_hash":        req.TxHash,
		"status":         entity.PaymentStatusCompleted,
	})
}

func (b *paymentBiz) ConfirmPayment(ctx context.Context, paymentId string, paymentMethod entity.PaymentMethod) error {
	payment, err := b.repo.GetById(ctx, paymentId)
	if err != nil {
		return fmt.Errorf("payment not found: %w", err)
	}

	if payment.Status == entity.PaymentStatusCompleted {
		return nil
	}

	if payment.Status != entity.PaymentStatusPending {
		return fmt.Errorf("cannot confirm payment with status %s", payment.Status)
	}

	fields := map[string]interface{}{
		"status":         entity.PaymentStatusCompleted,
		"payment_method": paymentMethod,
		"updated_at":     time.Now(),
	}

	if err = b.repo.UpdatePaymentFields(ctx, b.db, payment.Id, fields); err != nil {
		return fmt.Errorf("failed to update payment: %w", err)
	}

	eventData := map[string]interface{}{
		"payment_id":     payment.Id,
		"booking_id":     payment.BookingId,
		"amount":         payment.Amount,
		"status":         entity.PaymentStatusCompleted,
		"payment_method": paymentMethod,
		"timestamp":      time.Now().Unix(),
	}

	return b.outboxClient.CreateOutboxEvent(ctx, string(entity.EventTypePaymentCompleted), eventData)
}

// extractUUIDNoHyphens extracts 32-character UUID without hyphens from content or description
// Expected formats:
// - "QH" + 32 hexadecimal characters (UUID without hyphens)
// - Example: "QHFFBEF88798BE46D9917B5D41747F0DC1"
func (b *paymentBiz) extractUUIDNoHyphens(content, description string) string {
	// Try content first
	if uuid := extractUUIDFromText(content); uuid != "" {
		return uuid
	}

	if uuid := extractUUIDFromText(description); uuid != "" {
		return uuid
	}

	return ""
}

// extractUUIDFromText extracts 32-char UUID without hyphens from a single text field
func extractUUIDFromText(text string) string {
	// Strip "QH" prefix if exists
	if len(text) >= 34 && text[:2] == "QH" {
		candidate := text[2:34]
		if isValidUUIDNoHyphens(candidate) {
			return candidate
		}
	}

	// Find 32-character hexadecimal sequence anywhere in text
	for i := 0; i <= len(text)-32; i++ {
		candidate := text[i : i+32]
		if isValidUUIDNoHyphens(candidate) {
			return candidate
		}
	}

	return ""
}

// isValidUUIDNoHyphens checks if string is 32 hexadecimal characters (UUID without hyphens)
func isValidUUIDNoHyphens(s string) bool {
	if len(s) != 32 {
		return false
	}

	for _, c := range s {
		if !((c >= 'A' && c <= 'F') || (c >= 'a' && c <= 'f') || (c >= '0' && c <= '9')) {
			return false
		}
	}

	return true
}
