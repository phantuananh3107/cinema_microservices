package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"payment-service/internal/module/payment/entity"

	"github.com/uptrace/bun"
)

type PaymentRepository interface {
	FindByContent(ctx context.Context, content string) (*entity.Payment, error)
	FindByBookingId(ctx context.Context, bookingId string) (*entity.Payment, error)
	FindByShortCode(ctx context.Context, shortCode string) (*entity.Payment, error)
	FindByUUIDNoHyphens(ctx context.Context, uuidNoHyphens string) (*entity.Payment, error)
	UpdatePaymentFields(ctx context.Context, db bun.IDB, id string, fields map[string]interface{}) error
	Create(ctx context.Context, payment *entity.Payment) error
	GetById(ctx context.Context, id string) (*entity.Payment, error)
}

type paymentRepository struct {
	db *bun.DB
}

func NewPaymentRepository(db *bun.DB) PaymentRepository {
	return &paymentRepository{db: db}
}

func (r *paymentRepository) Create(ctx context.Context, payment *entity.Payment) error {
	_, err := r.db.NewInsert().
		Model(payment).
		Exec(ctx)
	return err
}

func (r *paymentRepository) GetById(ctx context.Context, id string) (*entity.Payment, error) {
	payment := new(entity.Payment)
	err := r.db.NewSelect().
		Model(payment).
		Where("id = ?", id).
		Scan(ctx)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("payment not found")
	}
	return payment, err
}

func (r *paymentRepository) FindByBookingId(ctx context.Context, bookingId string) (*entity.Payment, error) {
	payment := new(entity.Payment)
	err := r.db.NewSelect().
		Model(payment).
		Where("booking_id = ?", bookingId).
		Scan(ctx)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("payment not found for booking %s", bookingId)
	}
	return payment, err
}

func (r *paymentRepository) FindByContent(ctx context.Context, content string) (*entity.Payment, error) {
	payment := new(entity.Payment)
	err := r.db.NewSelect().
		Model(payment).
		Where("booking_id = ?", content).
		Scan(ctx)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("payment not found with content %s", content)
	}
	return payment, err
}

func (r *paymentRepository) FindByShortCode(ctx context.Context, shortCode string) (*entity.Payment, error) {
	payment := new(entity.Payment)
	err := r.db.NewSelect().
		Model(payment).
		Where("RIGHT(booking_id, 8) = UPPER(?)", shortCode).
		Scan(ctx)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("payment not found with short code %s", shortCode)
	}
	return payment, err
}

func (r *paymentRepository) FindByUUIDNoHyphens(ctx context.Context, uuidNoHyphens string) (*entity.Payment, error) {
	payment := new(entity.Payment)
	err := r.db.NewSelect().
		Model(payment).
		Where("REPLACE(UPPER(booking_id), '-', '') = UPPER(?)", uuidNoHyphens).
		Scan(ctx)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("payment not found with UUID (no hyphens) %s", uuidNoHyphens)
	}
	return payment, err
}

func (r *paymentRepository) UpdatePaymentFields(ctx context.Context, db bun.IDB, id string, fields map[string]interface{}) error {
	query := db.NewUpdate().
		Model((*entity.Payment)(nil)).
		Where("id = ?", id)

	for key, value := range fields {
		if key != "updated_at" {
			query = query.Set("? = ?", bun.Ident(key), value)
		}
	}

	_, err := query.Exec(ctx)
	return err
}
