package datastore

import (
	"context"
	"fmt"

	"booking-service/internal/models"

	"github.com/uptrace/bun"
)

func CreateTickets(ctx context.Context, db bun.IDB, tickets []*models.Ticket) error {
	if len(tickets) == 0 {
		return nil
	}

	_, err := db.NewInsert().
		Model(&tickets).
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to create tickets: %w", err)
	}

	return nil
}

func GetTicketsByBookingId(ctx context.Context, db bun.IDB, bookingId string) ([]*models.Ticket, error) {
	var tickets []*models.Ticket

	err := db.NewSelect().
		Model(&tickets).
		Where("booking_id = ?", bookingId).
		Scan(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get tickets: %w", err)
	}

	return tickets, nil
}

func UpdateTicketStatus(ctx context.Context, db bun.IDB, ticketId string, status models.TicketStatus) error {
	_, err := db.NewUpdate().
		Model((*models.Ticket)(nil)).
		Set("status = ?", status).
		Set("updated_at = CURRENT_TIMESTAMP").
		Where("id = ?", ticketId).
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to update ticket status: %w", err)
	}

	return nil
}

func GetBookedSeatsForShowtime(ctx context.Context, db bun.IDB, showtimeId string) (map[string]string, error) {
	var results []struct {
		SeatId    string `bun:"seat_id"`
		BookingId string `bun:"booking_id"`
	}

	err := db.NewSelect().
		TableExpr("tickets t").
		Column("t.seat_id", "t.booking_id").
		Join("INNER JOIN bookings b ON b.id = t.booking_id").
		Where("b.showtime_id = ?", showtimeId).
		Where("b.status IN (?, ?)", models.BookingStatusPending, models.BookingStatusConfirmed).
		Scan(ctx, &results)
	if err != nil {
		return nil, fmt.Errorf("failed to get booked seats: %w", err)
	}

	bookedSeats := make(map[string]string)
	for _, r := range results {
		bookedSeats[r.SeatId] = r.BookingId
	}

	return bookedSeats, nil
}

func GetTicketById(ctx context.Context, db bun.IDB, ticketId string) (*models.Ticket, error) {
	ticket := new(models.Ticket)

	err := db.NewSelect().
		Model(ticket).
		Where("id = ?", ticketId).
		Scan(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get ticket by id: %w", err)
	}

	return ticket, nil
}

func GetTicketsByShowtimeId(ctx context.Context, db bun.IDB, showtimeId string) ([]*models.Ticket, error) {
	var tickets []*models.Ticket

	err := db.NewSelect().
		TableExpr("tickets t").
		ColumnExpr("t.*").
		Join("INNER JOIN bookings b ON b.id = t.booking_id").
		Where("b.showtime_id = ?", showtimeId).
		Where("b.status IN (?, ?)", models.BookingStatusPending, models.BookingStatusConfirmed).
		Scan(ctx, &tickets)
	if err != nil {
		return nil, fmt.Errorf("failed to get tickets by showtime id: %w", err)
	}

	return tickets, nil
}
