package datastore

import (
	"context"
	"time"

	"booking-service/internal/models"

	"github.com/uptrace/bun"
)

type RevenueByTime struct {
	TimePeriod      time.Time `bun:"time_period"`
	TotalRevenue    float64   `bun:"total_revenue"`
	TotalBookings   int       `bun:"total_bookings"`
	AvgBookingValue float64   `bun:"avg_booking_value"`
}

type RevenueByShowtime struct {
	ShowtimeId    string  `bun:"showtime_id"`
	TotalRevenue  float64 `bun:"total_revenue"`
	TotalBookings int     `bun:"total_bookings"`
	TotalTickets  int     `bun:"total_tickets"`
}

type RevenueByBookingType struct {
	BookingType   string  `bun:"booking_type"`
	TotalRevenue  float64 `bun:"total_revenue"`
	TotalBookings int     `bun:"total_bookings"`
	Percentage    float64 `bun:"percentage"`
}

func GetRevenueByTime(ctx context.Context, db *bun.DB, startDate, endDate string, limit int) ([]*RevenueByTime, error) {
	var results []*RevenueByTime

	query := `
		SELECT
			DATE_TRUNC('day', created_at) as time_period,
			SUM(total_amount) as total_revenue,
			COUNT(*) as total_bookings,
			AVG(total_amount) as avg_booking_value
		FROM bookings
		WHERE status = ?
	`

	args := []interface{}{models.BookingStatusConfirmed}

	if startDate != "" {
		query += " AND created_at >= ?"
		args = append(args, startDate)
	}

	if endDate != "" {
		query += " AND created_at <= ?"
		args = append(args, endDate)
	}

	query += `
		GROUP BY DATE_TRUNC('day', created_at)
		ORDER BY time_period DESC
		LIMIT ?
	`
	args = append(args, limit)

	err := db.NewRaw(query, args...).Scan(ctx, &results)
	if err != nil {
		return nil, err
	}

	return results, nil
}

func GetRevenueByShowtime(ctx context.Context, db *bun.DB, startDate, endDate, showtimeId string, limit int) ([]*RevenueByShowtime, error) {
	var results []*RevenueByShowtime

	query := db.NewSelect().
		TableExpr("bookings b").
		ColumnExpr("b.showtime_id").
		ColumnExpr("SUM(b.total_amount) as total_revenue").
		ColumnExpr("COUNT(DISTINCT b.id) as total_bookings").
		ColumnExpr("COALESCE(COUNT(t.id), 0) as total_tickets").
		Join("LEFT JOIN tickets t ON t.booking_id = b.id").
		Where("b.status = ?", models.BookingStatusConfirmed)

	if startDate != "" {
		query = query.Where("b.created_at >= ?", startDate)
	}

	if endDate != "" {
		query = query.Where("b.created_at <= ?", endDate)
	}

	if showtimeId != "" {
		query = query.Where("b.showtime_id = ?", showtimeId)
	}

	err := query.
		Group("b.showtime_id").
		Order("total_revenue DESC").
		Limit(limit).
		Scan(ctx, &results)
	if err != nil {
		return nil, err
	}

	return results, nil
}

func GetRevenueByBookingType(ctx context.Context, db *bun.DB, startDate, endDate string) ([]*RevenueByBookingType, error) {
	var results []*RevenueByBookingType

	query := `
		WITH booking_stats AS (
			SELECT
				booking_type,
				SUM(total_amount) as total_revenue,
				COUNT(*) as total_bookings
			FROM bookings
			WHERE status = ?
	`

	args := []interface{}{models.BookingStatusConfirmed}

	if startDate != "" {
		query += " AND created_at >= ?"
		args = append(args, startDate)
	}

	if endDate != "" {
		query += " AND created_at <= ?"
		args = append(args, endDate)
	}

	query += `
			GROUP BY booking_type
		),
		total_stats AS (
			SELECT SUM(total_revenue) as grand_total FROM booking_stats
		)
		SELECT
			bs.booking_type,
			bs.total_revenue,
			bs.total_bookings,
			ROUND((bs.total_revenue / NULLIF(ts.grand_total, 0) * 100)::numeric, 2) as percentage
		FROM booking_stats bs
		CROSS JOIN total_stats ts
		ORDER BY bs.total_revenue DESC
	`

	err := db.NewRaw(query, args...).Scan(ctx, &results)
	if err != nil {
		return nil, err
	}

	return results, nil
}

func GetTotalRevenue(ctx context.Context, db *bun.DB, startDate, endDate string) (float64, error) {
	var total float64

	query := db.NewSelect().
		TableExpr("bookings").
		ColumnExpr("COALESCE(SUM(total_amount), 0)").
		Where("status = ?", models.BookingStatusConfirmed)

	if startDate != "" {
		query = query.Where("created_at >= ?", startDate)
	}

	if endDate != "" {
		query = query.Where("created_at <= ?", endDate)
	}

	err := query.Scan(ctx, &total)
	if err != nil {
		return 0, err
	}

	return total, nil
}
