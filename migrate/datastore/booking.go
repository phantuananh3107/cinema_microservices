package datastore

import (
	"context"
	"fmt"

	"migrate-cmd/models"

	"github.com/uptrace/bun"
)

func CreateBookingTable(ctx context.Context, db *bun.DB) error {
	_, err := db.NewCreateTable().
		Model((*models.Booking)(nil)).
		IfNotExists().
		ForeignKey("(user_id) REFERENCES users(id) ON DELETE CASCADE").
		ForeignKey("(showtime_id) REFERENCES showtimes(id) ON DELETE CASCADE").
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to create bookings table: %w", err)
	}
	return nil
}

func CreateTicketTable(ctx context.Context, db *bun.DB) error {
	_, err := db.NewCreateTable().
		Model((*models.Ticket)(nil)).
		IfNotExists().
		ForeignKey("(booking_id) REFERENCES bookings(id) ON DELETE CASCADE").
		ForeignKey("(seat_id) REFERENCES seats(id) ON DELETE CASCADE").
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to create tickets table: %w", err)
	}

	_, err = db.NewCreateIndex().
		Model((*models.Ticket)(nil)).
		Column("showtime_id", "seat_id").
		Index("idx_uniq_ticket_showtime_seat").
		Unique().
		IfNotExists().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to create index tickets table: %w", err)
	}

	return nil
}

func CreatePaymentTable(ctx context.Context, db *bun.DB) error {
	_, err := db.NewCreateTable().
		Model((*models.Payment)(nil)).
		IfNotExists().
		ForeignKey("(booking_id) REFERENCES bookings(id) ON DELETE CASCADE").
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to create payments table: %w", err)
	}
	return nil
}

func DropBookingTable(ctx context.Context, db *bun.DB) error {
	_, err := db.NewDropTable().
		Model((*models.Booking)(nil)).
		IfExists().
		Cascade().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to drop bookings table: %w", err)
	}
	return nil
}

func DropTicketTable(ctx context.Context, db *bun.DB) error {
	_, err := db.NewDropTable().
		Model((*models.Ticket)(nil)).
		IfExists().
		Cascade().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to drop tickets table: %w", err)
	}
	return nil
}

func DropPaymentTable(ctx context.Context, db *bun.DB) error {
	_, err := db.NewDropTable().
		Model((*models.Payment)(nil)).
		IfExists().
		Cascade().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to drop payments table: %w", err)
	}
	return nil
}
