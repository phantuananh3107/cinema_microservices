package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net"
	"reflect"
	"strings"
	"testing"
	"time"
	"unsafe"

	bookinggrpc "booking-service/internal/grpc"
	"booking-service/internal/models"
	"booking-service/proto/pb"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/alicebob/miniredis/v2"
	_ "github.com/mattn/go-sqlite3"
	"github.com/redis/go-redis/v9"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	gogrpc "google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/test/bufconn"
)

func TestBookingService_normalizePagination(t *testing.T) {
	service := &BookingService{}

	t.Run("defaults invalid page and size to stable pagination values", func(t *testing.T) {
		// Test Case ID: TC-GO-BIZ-001
		// Mục tiêu: invalid pagination input must fall back to the default page/size pair.
		page, size, limit, offset := service.normalizePagination(0, 0)
		if page != 1 || size != 10 || limit != 10 || offset != 0 {
			t.Fatalf("unexpected pagination result: page=%d size=%d limit=%d offset=%d", page, size, limit, offset)
		}
	})

	t.Run("caps oversized page size at the service limit", func(t *testing.T) {
		// Test Case ID: TC-GO-BIZ-002
		// Mục tiêu: very large page sizes must be clamped to avoid heavy queries.
		page, size, limit, offset := service.normalizePagination(2, 1000)
		if page != 2 || size != 100 || limit != 100 || offset != 100 {
			t.Fatalf("unexpected pagination result: page=%d size=%d limit=%d offset=%d", page, size, limit, offset)
		}
	})
}

func TestBookingService_isValidStatus(t *testing.T) {
	service := &BookingService{}

	// Test Case ID: TC-GO-BIZ-003
	// Mục tiêu: confirmed bookings must be accepted as a supported business status.
	if !service.isValidStatus(string(models.BookingStatusConfirmed)) {
		t.Fatal("expected CONFIRMED to be treated as a valid booking status")
	}

	t.Run("accepts all supported statuses and rejects unsupported status values", func(t *testing.T) {
		// Test Case ID: TC-GO-BIZ-003 (branch extension)
		// Mục tiêu: cover all valid status branches plus one invalid branch for the status guard.
		cases := []struct {
			status string
			want   bool
		}{
			{status: string(models.BookingStatusPending), want: true},
			{status: string(models.BookingStatusConfirmed), want: true},
			{status: string(models.BookingStatusCancelled), want: true},
			{status: "INVALID_STATUS", want: false},
		}

		for _, tc := range cases {
			got := service.isValidStatus(tc.status)
			if got != tc.want {
				t.Fatalf("unexpected status validation result for %q: got=%v want=%v", tc.status, got, tc.want)
			}
		}
	})
}

func TestBookingService_enrichBookingsWithShowtimeData(t *testing.T) {
	ctx := context.Background()
	fakeMovieService := &fakeMovieServiceServer{
		showtimesResponse: []*pb.ShowtimeData{
			{
				Id:           "showtime-1",
				MovieTitle:   "Interstellar",
				ShowtimeDate: "2026-04-17",
				ShowtimeTime: "19:30",
				SeatNumbers:  []string{"A1", "A2"},
			},
		},
	}
	service := &BookingService{
		movieClient: newTestMovieClient(t, fakeMovieService),
	}
	now := time.Date(2026, 4, 17, 10, 0, 0, 0, time.UTC)

	bookings := []*models.Booking{
		{
			Id:          "booking-1",
			UserId:      "user-1",
			ShowtimeId:  "showtime-1",
			TotalAmount: 180000,
			Status:      models.BookingStatusConfirmed,
			BookingType: models.BookingTypeOnline,
			CreatedAt:   now,
		},
	}

	// Test Case ID: TC-GO-BIZ-005
	// Mục tiêu: the booking history response must merge local booking fields with movie-service showtime details.
	histories, err := service.enrichBookingsWithShowtimeData(ctx, bookings)
	if err != nil {
		t.Fatalf("expected enrichBookingsWithShowtimeData to succeed, got %v", err)
	}

	if len(fakeMovieService.requestedShowtimeIDs) != 1 || fakeMovieService.requestedShowtimeIDs[0] != "showtime-1" {
		t.Fatalf("expected movie client to request showtime-1, got %v", fakeMovieService.requestedShowtimeIDs)
	}

	if len(histories) != 1 {
		t.Fatalf("expected 1 booking history, got %d", len(histories))
	}

	history := histories[0]
	if history.MovieTitle != "Interstellar" {
		t.Fatalf("expected movie title Interstellar, got %q", history.MovieTitle)
	}
	if history.ShowtimeDate != "2026-04-17" || history.ShowtimeTime != "19:30" {
		t.Fatalf("unexpected showtime information: date=%q time=%q", history.ShowtimeDate, history.ShowtimeTime)
	}
	if history.SeatNumbers != "A1, A2" {
		t.Fatalf("expected joined seat numbers A1, A2, got %q", history.SeatNumbers)
	}
	if history.Id != "booking-1" || history.UserId != "user-1" || history.ShowtimeId != "showtime-1" {
		t.Fatalf("unexpected booking metadata in history: %+v", history)
	}

	t.Run("keeps booking metadata when showtime is missing from movie-service response", func(t *testing.T) {
		// Test Case ID: TC-GO-BIZ-005 (branch extension)
		// Mục tiêu: when movie-service omits a showtime, local booking metadata should still be returned without enrichment fields.
		service := &BookingService{
			movieClient: newTestMovieClient(t, &fakeMovieServiceServer{
				showtimesResponse: []*pb.ShowtimeData{
					{
						Id:           "showtime-other",
						MovieTitle:   "Other Movie",
						ShowtimeDate: "2026-04-20",
						ShowtimeTime: "21:00",
						SeatNumbers:  []string{"Z9"},
					},
				},
			}),
		}

		histories, err := service.enrichBookingsWithShowtimeData(ctx, bookings)
		if err != nil {
			t.Fatalf("expected enrichBookingsWithShowtimeData to succeed for missing showtime branch, got %v", err)
		}
		if len(histories) != 1 {
			t.Fatalf("expected 1 booking history for missing showtime branch, got %d", len(histories))
		}

		history := histories[0]
		if history.Id != "booking-1" || history.ShowtimeId != "showtime-1" {
			t.Fatalf("expected booking metadata to remain available, got %+v", history)
		}
		if history.MovieTitle != "" || history.ShowtimeDate != "" || history.ShowtimeTime != "" || history.SeatNumbers != "" {
			t.Fatalf("expected no enrichment fields when showtime is missing, got %+v", history)
		}
	})

	t.Run("returns wrapped error when movie service get showtimes fails", func(t *testing.T) {
		// Test Case ID: TC-GO-BIZ-015
		// Mục tiêu: the service must surface movie-service failures with local error context.
		service := &BookingService{
			movieClient: newTestMovieClient(t, &fakeMovieServiceServer{
				getShowtimesErr: errors.New("movie service unavailable"),
			}),
		}

		_, err := service.enrichBookingsWithShowtimeData(ctx, bookings)
		if err == nil {
			t.Fatal("expected enrichBookingsWithShowtimeData to fail when movie service GetShowtimes fails")
		}
		if !strings.Contains(err.Error(), "failed to get showtime data") {
			t.Fatalf("expected wrapped showtime error, got %v", err)
		}
	})
}

func TestBookingService_checkSeatAvailability(t *testing.T) {
	ctx := context.Background()

	t.Run("returns ErrSeatAlreadyLocked when a different user owns the concurrent lock", func(t *testing.T) {
		// Test Case ID: TC-GO-BIZ-006
		// Mục tiêu: stop at the local Redis lock boundary when another user is already processing the seat.
		redisClient := newTestRedisClient(t)
		if err := redisClient.Set(ctx, "seat:concurrent_lock:showtime-1:A1", "user-x", time.Minute).Err(); err != nil {
			t.Fatalf("failed to seed concurrent lock: %v", err)
		}

		service := &BookingService{
			redisClient: redisClient,
		}

		err := service.checkSeatAvailability(ctx, "showtime-1", []string{"A1"}, "user-current")
		if !errors.Is(err, ErrSeatAlreadyLocked) {
			t.Fatalf("expected ErrSeatAlreadyLocked, got %v", err)
		}
	})

	t.Run("returns ErrSeatAlreadyBooked when a fixed seat lock already exists", func(t *testing.T) {
		// Test Case ID: TC-GO-BIZ-007
		// Mục tiêu: reject seats that have already been permanently locked in Redis before touching the DB lookup.
		redisClient := newTestRedisClient(t)
		if err := redisClient.Set(ctx, "seat_lock:showtime-1:A2", "locked", time.Minute).Err(); err != nil {
			t.Fatalf("failed to seed seat lock: %v", err)
		}

		service := &BookingService{
			redisClient: redisClient,
		}

		err := service.checkSeatAvailability(ctx, "showtime-1", []string{"A2"}, "user-current")
		if !errors.Is(err, ErrSeatAlreadyBooked) {
			t.Fatalf("expected ErrSeatAlreadyBooked, got %v", err)
		}
	})

	t.Run("returns ErrSeatAlreadyBooked when the booked seat is already present in the local database", func(t *testing.T) {
		// Test Case ID: TC-GO-BIZ-008
		// Mục tiêu: verify the DB-backed booked-seat read is honored as the final consistency check.
		// Kiểm tra DB: the test seeds bookings/tickets rows, proves the seat is present before the call, and verifies it remains unchanged after the call.
		// Hoàn tác: the test uses an isolated in-memory SQLite database and closes it in cleanup so no state leaks across runs.
		roDB := newSQLiteBookingDB(t)
		seedBookedSeat(t, ctx, roDB, "booking-db-1", "showtime-1", "A3")

		before, err := getBookedSeatsForShowtime(t, ctx, roDB, "showtime-1")
		if err != nil {
			t.Fatalf("failed to query booked seats before service call: %v", err)
		}
		if before["A3"] != "booking-db-1" {
			t.Fatalf("expected pre-state seat A3 to belong to booking-db-1, got %v", before)
		}

		service := &BookingService{
			roDb:        roDB,
			redisClient: newTestRedisClient(t),
		}

		err = service.checkSeatAvailability(ctx, "showtime-1", []string{"A3"}, "user-current")
		if !errors.Is(err, ErrSeatAlreadyBooked) {
			t.Fatalf("expected ErrSeatAlreadyBooked from DB-backed booked seat lookup, got %v", err)
		}

		after, err := getBookedSeatsForShowtime(t, ctx, roDB, "showtime-1")
		if err != nil {
			t.Fatalf("failed to query booked seats after service call: %v", err)
		}
		if len(after) != 1 || after["A3"] != "booking-db-1" {
			t.Fatalf("expected booked seat mapping to remain unchanged, got %v", after)
		}
	})

	t.Run("returns nil when the concurrent lock belongs to the same user and no booked seats exist", func(t *testing.T) {
		// Test Case ID: TC-GO-BIZ-016
		// Mục tiêu: the current user must be allowed to continue when rechecking its own temporary lock.
		// Kiểm tra DB: the test verifies the booked-seat query stays empty before and after the service call.
		// Hoàn tác: the test uses an isolated in-memory SQLite database that is disposed during cleanup.
		roDB := newSQLiteBookingDB(t)
		redisClient := newTestRedisClient(t)
		if err := redisClient.Set(ctx, "seat:concurrent_lock:showtime-1:A1", "user-current", time.Minute).Err(); err != nil {
			t.Fatalf("failed to seed same-user concurrent lock: %v", err)
		}

		before, err := getBookedSeatsForShowtime(t, ctx, roDB, "showtime-1")
		if err != nil {
			t.Fatalf("failed to query booked seats before success path: %v", err)
		}
		if len(before) != 0 {
			t.Fatalf("expected no booked seats before availability check, got %v", before)
		}

		service := &BookingService{
			roDb:        roDB,
			redisClient: redisClient,
		}

		if err := service.checkSeatAvailability(ctx, "showtime-1", []string{"A1"}, "user-current"); err != nil {
			t.Fatalf("expected checkSeatAvailability to succeed for same-user lock, got %v", err)
		}

		after, err := getBookedSeatsForShowtime(t, ctx, roDB, "showtime-1")
		if err != nil {
			t.Fatalf("failed to query booked seats after success path: %v", err)
		}
		if len(after) != 0 {
			t.Fatalf("expected no booked seats after availability check, got %v", after)
		}
	})

	t.Run("returns redis error when concurrent lock lookup fails", func(t *testing.T) {
		// Test Case ID: TC-GO-BIZ-006 (error-path extension)
		// Mục tiêu: redis lookup failures should be surfaced instead of being swallowed.
		server := miniredis.RunT(t)
		redisClient := redis.NewClient(&redis.Options{Addr: server.Addr()})
		server.Close()
		t.Cleanup(func() {
			_ = redisClient.Close()
		})

		service := &BookingService{
			redisClient: redisClient,
		}

		err := service.checkSeatAvailability(ctx, "showtime-1", []string{"A9"}, "user-current")
		if err == nil {
			t.Fatal("expected redis error when concurrent lock lookup fails")
		}
	})

	t.Run("returns wrapped error when datastore booked-seat query fails", func(t *testing.T) {
		// Test Case ID: TC-GO-BIZ-008 (error-path extension)
		// Mục tiêu: datastore query failures should return local context for easier debugging.
		roDB := newSQLiteBookingDB(t)
		if err := roDB.Close(); err != nil {
			t.Fatalf("failed to close readonly DB for error-path setup: %v", err)
		}

		service := &BookingService{
			roDb:        roDB,
			redisClient: newTestRedisClient(t),
		}

		err := service.checkSeatAvailability(ctx, "showtime-1", []string{"A10"}, "user-current")
		if err == nil {
			t.Fatal("expected datastore error when booked-seat query fails")
		}
		if !strings.Contains(err.Error(), "failed to check booked seats") {
			t.Fatalf("expected wrapped booked-seat error, got %v", err)
		}
	})

	t.Run("returns redis error when seat lock exists lookup fails", func(t *testing.T) {
		// Test Case ID: TC-GO-BIZ-007 (error-path extension)
		// Mục tiêu: redis exists errors should be returned immediately from seat lock validation.
		redisClient := newTestRedisClient(t)
		redisClient.AddHook(commandErrorHook{
			command: "exists",
			err:     errors.New("forced exists failure"),
		})

		service := &BookingService{
			redisClient: redisClient,
		}

		err := service.checkSeatAvailability(ctx, "showtime-1", []string{"A11"}, "user-current")
		if err == nil {
			t.Fatal("expected redis exists error when lock lookup fails")
		}
		if !strings.Contains(err.Error(), "forced exists failure") {
			t.Fatalf("expected forced exists failure error, got %v", err)
		}
	})
}

func TestBookingService_acquireDistributedSeatLocks(t *testing.T) {
	ctx := context.Background()

	t.Run("releases previously acquired locks when a later seat cannot be locked", func(t *testing.T) {
		// Test Case ID: TC-GO-BIZ-012
		// Mục tiêu: partial lock acquisition must clean up earlier keys to avoid orphaned seat locks.
		redisClient := newTestRedisClient(t)
		if err := redisClient.Set(ctx, "seat:concurrent_lock:showtime-1:A2", "other-user", time.Minute).Err(); err != nil {
			t.Fatalf("failed to seed second seat lock: %v", err)
		}

		service := &BookingService{redisClient: redisClient}
		lockKeys, err := service.acquireDistributedSeatLocks(ctx, "showtime-1", []string{"A1", "A2"}, "user-current", time.Minute)
		if err == nil {
			t.Fatal("expected acquireDistributedSeatLocks to fail when the second seat is already being processed")
		}
		if !errors.Is(err, ErrSeatAlreadyLocked) {
			t.Fatalf("expected ErrSeatAlreadyLocked, got %v", err)
		}
		if lockKeys != nil {
			t.Fatalf("expected no returned lock keys on failure, got %v", lockKeys)
		}

		exists, err := redisClient.Exists(ctx, "seat:concurrent_lock:showtime-1:A1").Result()
		if err != nil {
			t.Fatalf("failed to check cleanup for first seat lock: %v", err)
		}
		if exists != 0 {
			t.Fatal("expected first seat lock to be released after second-seat failure")
		}
	})
}

func TestBookingService_GetUserBookings(t *testing.T) {
	ctx := context.Background()
	roDB := newSQLiteBookingDB(t)
	seedBookingRecord(t, ctx, roDB, &models.Booking{
		Id:          "booking-confirmed",
		UserId:      "user-1",
		ShowtimeId:  "showtime-confirmed",
		TotalAmount: 180000,
		Status:      models.BookingStatusConfirmed,
		BookingType: models.BookingTypeOnline,
		CreatedAt:   time.Date(2026, 4, 17, 10, 0, 0, 0, time.UTC),
	})
	seedBookingRecord(t, ctx, roDB, &models.Booking{
		Id:          "booking-pending",
		UserId:      "user-1",
		ShowtimeId:  "showtime-pending",
		TotalAmount: 90000,
		Status:      models.BookingStatusPending,
		BookingType: models.BookingTypeOffline,
		CreatedAt:   time.Date(2026, 4, 18, 10, 0, 0, 0, time.UTC),
	})

	t.Run("uses the valid status branch and enriches showtime details", func(t *testing.T) {
		// Test Case ID: TC-GO-BIZ-013
		// Mục tiêu: confirmed bookings should use the filtered query path and still be enriched with movie-service data.
		// Kiểm tra DB: the test seeds local booking rows and verifies the filtered branch returns only the confirmed row plus the correct total count.
		// Hoàn tác: the data lives in an isolated in-memory SQLite database closed during test cleanup.
		fakeMovieService := &fakeMovieServiceServer{
			showtimesResponse: []*pb.ShowtimeData{
				{
					Id:           "showtime-confirmed",
					MovieTitle:   "Dune: Part Two",
					ShowtimeDate: "2026-04-17",
					ShowtimeTime: "20:00",
					SeatNumbers:  []string{"B1", "B2"},
				},
			},
		}
		service := &BookingService{
			roDb:        roDB,
			movieClient: newTestMovieClient(t, fakeMovieService),
		}

		histories, total, err := service.GetUserBookings(ctx, "user-1", 1, 10, string(models.BookingStatusConfirmed))
		if err != nil {
			t.Fatalf("expected GetUserBookings filtered branch to succeed, got %v", err)
		}
		if total != 1 {
			t.Fatalf("expected total confirmed bookings to be 1, got %d", total)
		}
		if len(histories) != 1 {
			t.Fatalf("expected 1 confirmed booking history, got %d", len(histories))
		}
		if histories[0].Id != "booking-confirmed" {
			t.Fatalf("expected confirmed booking history, got %+v", histories[0])
		}
		if histories[0].MovieTitle != "Dune: Part Two" || histories[0].SeatNumbers != "B1, B2" {
			t.Fatalf("expected enriched movie/showtime details, got %+v", histories[0])
		}
		if len(fakeMovieService.requestedShowtimeIDs) != 1 || fakeMovieService.requestedShowtimeIDs[0] != "showtime-confirmed" {
			t.Fatalf("expected filtered branch to enrich only confirmed showtime, got %v", fakeMovieService.requestedShowtimeIDs)
		}
	})

	t.Run("falls back to the unfiltered branch when status input is invalid", func(t *testing.T) {
		// Test Case ID: TC-GO-BIZ-014
		// Mục tiêu: invalid status input should keep the current fallback behavior that loads unfiltered booking history.
		// Kiểm tra DB: the test uses seeded local booking rows and verifies both matching rows are returned by the unfiltered branch.
		// Hoàn tác: the test reads from the same isolated in-memory SQLite database used only inside this package test.
		fakeMovieService := &fakeMovieServiceServer{
			showtimesResponse: []*pb.ShowtimeData{
				{
					Id:           "showtime-pending",
					MovieTitle:   "Wonka",
					ShowtimeDate: "2026-04-18",
					ShowtimeTime: "18:30",
					SeatNumbers:  []string{"C1"},
				},
				{
					Id:           "showtime-confirmed",
					MovieTitle:   "Dune: Part Two",
					ShowtimeDate: "2026-04-17",
					ShowtimeTime: "20:00",
					SeatNumbers:  []string{"B1", "B2"},
				},
			},
		}
		service := &BookingService{
			roDb:        roDB,
			movieClient: newTestMovieClient(t, fakeMovieService),
		}

		histories, total, err := service.GetUserBookings(ctx, "user-1", 1, 10, "INVALID_STATUS")
		if err != nil {
			t.Fatalf("expected GetUserBookings invalid-status fallback to succeed, got %v", err)
		}
		if total != 0 {
			t.Fatalf("expected current fallback implementation to leave total at 0, got %d", total)
		}
		if len(histories) != 2 {
			t.Fatalf("expected both bookings from the unfiltered branch, got %d", len(histories))
		}
		if histories[0].Id != "booking-pending" || histories[1].Id != "booking-confirmed" {
			t.Fatalf("expected unfiltered bookings ordered by created_at desc, got %+v", histories)
		}
		if len(fakeMovieService.requestedShowtimeIDs) != 2 {
			t.Fatalf("expected invalid-status fallback to enrich both showtimes, got %v", fakeMovieService.requestedShowtimeIDs)
		}
	})
}

func TestBookingService_CreateBooking(t *testing.T) {
	ctx := context.Background()

	t.Run("creates a pending booking and emits a booking-created outbox request", func(t *testing.T) {
		// Test Case ID: TC-GO-BIZ-009
		// Mục tiêu: the success path must persist the local booking and send the local outbox request with the created payload.
		db, mock := newMockPostgresDB(t)
		redisClient := newTestRedisClient(t)
		outboxServer := &fakeOutboxServiceServer{}
		fakeMovieService := &fakeMovieServiceServer{
			seatsWithPriceResponse: &pb.GetSeatsWithPriceResponse{
				Success:     true,
				TotalAmount: 180000,
				Data: []*pb.SeatPriceData{
					{SeatId: "A1", SeatNumber: "A1", Available: true},
					{SeatId: "A2", SeatNumber: "A2", Available: true},
				},
			},
		}
		service := &BookingService{
			db:           db,
			roDb:         newSQLiteBookingDB(t),
			movieClient:  newTestMovieClient(t, fakeMovieService),
			outboxClient: newTestOutboxClient(t, outboxServer),
			redisClient:  redisClient,
		}

		mock.ExpectBegin()
		mock.ExpectQuery(`INSERT INTO .*bookings.*`).
			WillReturnRows(sqlmock.NewRows([]string{"id", "user_id", "showtime_id", "total_amount", "status", "staff_id", "booking_type", "created_at", "updated_at"}).
				AddRow("booking-created", "user-1", "showtime-1", 180000.0, "PENDING", "", "ONLINE", time.Date(2026, 4, 17, 12, 0, 0, 0, time.UTC), nil))
		mock.ExpectCommit()

		booking, err := service.CreateBooking(ctx, "user-1", "showtime-1", []string{"A1", "A2"}, 180000, models.BookingTypeOnline)
		if err != nil {
			t.Fatalf("expected CreateBooking success path to succeed, got %v", err)
		}
		if booking == nil {
			t.Fatal("expected CreateBooking to return a booking")
		}
		if booking.UserId != "user-1" || booking.ShowtimeId != "showtime-1" || booking.Status != models.BookingStatusPending {
			t.Fatalf("unexpected booking returned from success path: %+v", booking)
		}
		if booking.TotalAmount != 180000 {
			t.Fatalf("expected booking total amount 180000, got %v", booking.TotalAmount)
		}
		if len(outboxServer.requests) != 1 {
			t.Fatalf("expected one outbox request, got %d", len(outboxServer.requests))
		}
		if outboxServer.requests[0].GetEventType() != string(models.EventTypeBookingCreated) {
			t.Fatalf("expected BOOKING_CREATED event type, got %q", outboxServer.requests[0].GetEventType())
		}

		var payload models.BookingEventData
		if err := json.Unmarshal([]byte(outboxServer.requests[0].GetPayload()), &payload); err != nil {
			t.Fatalf("failed to decode outbox payload: %v", err)
		}
		if payload.UserId != "user-1" || payload.ShowtimeId != "showtime-1" || len(payload.SeatIds) != 2 {
			t.Fatalf("unexpected outbox payload: %+v", payload)
		}
		if fakeMovieService.requestedSeatsWithPrice == nil || fakeMovieService.requestedSeatsWithPrice.ShowtimeID != "showtime-1" {
			t.Fatalf("expected CreateBooking to request seat prices for showtime-1, got %+v", fakeMovieService.requestedSeatsWithPrice)
		}
		if err := mock.ExpectationsWereMet(); err != nil {
			t.Fatalf("database expectations were not met: %v", err)
		}
	})

	t.Run("rejects online bookings when the client total does not match the movie-service total", func(t *testing.T) {
		// Test Case ID: TC-GO-BIZ-010
		// Mục tiêu: amount validation must fail before the local booking is persisted or the outbox is called.
		db, mock := newMockPostgresDB(t)
		outboxServer := &fakeOutboxServiceServer{}
		service := &BookingService{
			db:           db,
			roDb:         newSQLiteBookingDB(t),
			movieClient:  newTestMovieClient(t, &fakeMovieServiceServer{seatsWithPriceResponse: &pb.GetSeatsWithPriceResponse{Success: true, TotalAmount: 180000, Data: []*pb.SeatPriceData{{SeatId: "A1", SeatNumber: "A1", Available: true}}}}),
			outboxClient: newTestOutboxClient(t, outboxServer),
			redisClient:  newTestRedisClient(t),
		}

		booking, err := service.CreateBooking(ctx, "user-1", "showtime-1", []string{"A1"}, 100000, models.BookingTypeOnline)
		if err == nil {
			t.Fatal("expected CreateBooking to fail on total mismatch")
		}
		if !strings.Contains(err.Error(), "invalid total amount") {
			t.Fatalf("expected invalid total amount error, got %v", err)
		}
		if booking != nil {
			t.Fatalf("expected no booking on total mismatch, got %+v", booking)
		}
		if len(outboxServer.requests) != 0 {
			t.Fatalf("expected no outbox request on total mismatch, got %d", len(outboxServer.requests))
		}
		if err := mock.ExpectationsWereMet(); err != nil {
			t.Fatalf("unexpected database interaction on total mismatch: %v", err)
		}
	})

	t.Run("rejects bookings when movie service reports a seat is unavailable", func(t *testing.T) {
		// Test Case ID: TC-GO-BIZ-011
		// Mục tiêu: CreateBooking must stop before persistence when any seat returned by movie-service is unavailable.
		db, mock := newMockPostgresDB(t)
		outboxServer := &fakeOutboxServiceServer{}
		service := &BookingService{
			db:           db,
			roDb:         newSQLiteBookingDB(t),
			movieClient:  newTestMovieClient(t, &fakeMovieServiceServer{seatsWithPriceResponse: &pb.GetSeatsWithPriceResponse{Success: true, TotalAmount: 180000, Data: []*pb.SeatPriceData{{SeatId: "A1", SeatNumber: "A1", Available: false}}}}),
			outboxClient: newTestOutboxClient(t, outboxServer),
			redisClient:  newTestRedisClient(t),
		}

		booking, err := service.CreateBooking(ctx, "user-1", "showtime-1", []string{"A1"}, 180000, models.BookingTypeOnline)
		if err == nil {
			t.Fatal("expected CreateBooking to fail when a seat is unavailable")
		}
		if !strings.Contains(err.Error(), "is not available") {
			t.Fatalf("expected seat unavailable error, got %v", err)
		}
		if booking != nil {
			t.Fatalf("expected no booking when a seat is unavailable, got %+v", booking)
		}
		if len(outboxServer.requests) != 0 {
			t.Fatalf("expected no outbox request when seat availability fails, got %d", len(outboxServer.requests))
		}
		if err := mock.ExpectationsWereMet(); err != nil {
			t.Fatalf("unexpected database interaction on seat unavailable branch: %v", err)
		}
	})
}

func TestBookingService_GetBookingByID(t *testing.T) {
	ctx := context.Background()

	t.Run("returns booking when booking id exists in readonly datastore", func(t *testing.T) {
		// Test Case ID: TC-GO-BIZ-026
		// Mục tiêu: ensure GetBookingByID returns the persisted booking payload for a valid id.
		// Kiểm tra DB: this test seeds the booking row and verifies the fetched row fields from readonly DB.
		// Hoàn tác: the in-memory SQLite database is isolated per test and closed in cleanup.
		roDB := newSQLiteBookingDB(t)
		seedBookingRecord(t, ctx, roDB, &models.Booking{
			Id:          "booking-get-success",
			UserId:      "user-get-success",
			ShowtimeId:  "showtime-get-success",
			TotalAmount: 120000,
			Status:      models.BookingStatusConfirmed,
			BookingType: models.BookingTypeOnline,
			CreatedAt:   time.Date(2026, 4, 18, 9, 0, 0, 0, time.UTC),
		})
		t.Logf("da tao du lieu booking id=%s cho nhanh thanh cong GetBookingByID", "booking-get-success")

		service := &BookingService{roDb: roDB}
		booking, err := service.GetBookingByID(ctx, "booking-get-success")
		if err != nil {
			t.Fatalf("expected GetBookingByID to succeed, got %v", err)
		}
		if booking.Id != "booking-get-success" || booking.UserId != "user-get-success" {
			t.Fatalf("unexpected booking payload returned: %+v", booking)
		}
		t.Logf("GetBookingByID tra ve booking=%+v", booking)
	})

	t.Run("returns ErrBookingNotFound when booking id does not exist", func(t *testing.T) {
		// Test Case ID: TC-GO-BIZ-027
		// Mục tiêu: missing booking ids must be mapped to service-level ErrBookingNotFound.
		// Kiểm tra DB: readonly DB is intentionally left without matching booking id.
		// Hoàn tác: isolated in-memory DB is disposed by test cleanup.
		service := &BookingService{roDb: newSQLiteBookingDB(t)}
		_, err := service.GetBookingByID(ctx, "booking-missing")
		if !errors.Is(err, ErrBookingNotFound) {
			t.Fatalf("expected ErrBookingNotFound for missing booking id, got %v", err)
		}
		t.Logf("GetBookingByID tra ve dung ErrBookingNotFound voi id=%s", "booking-missing")
	})
}

func TestBookingService_UpdateBookingStatus(t *testing.T) {
	ctx := context.Background()

	t.Run("rejects unsupported status before hitting datastore update", func(t *testing.T) {
		// Test Case ID: TC-GO-BIZ-028
		// Mục tiêu: UpdateBookingStatus should fail fast for unsupported status values.
		service := &BookingService{
			db:   newSQLiteBookingDB(t),
			roDb: newSQLiteBookingDB(t),
		}

		_, err := service.UpdateBookingStatus(ctx, "booking-any", "INVALID_STATUS")
		if err == nil || !strings.Contains(err.Error(), "invalid booking status") {
			t.Fatalf("expected invalid booking status error, got %v", err)
		}
		t.Logf("UpdateBookingStatus tu choi trang thai khong hop le dung nhu ky vong: %v", err)
	})

	t.Run("updates status and returns booking user id on success path", func(t *testing.T) {
		// Test Case ID: TC-GO-BIZ-029
		// Mục tiêu: a valid status update must persist status transition and return booking user id.
		// Kiểm tra DB: this test verifies booking status before and after UpdateBookingStatus call.
		// Hoàn tác: isolated in-memory DB is scoped per test and cleaned up automatically.
		db := newSQLiteBookingDB(t)
		seedBookingRecord(t, ctx, db, &models.Booking{
			Id:          "booking-update-success",
			UserId:      "user-update-success",
			ShowtimeId:  "showtime-update-success",
			TotalAmount: 145000,
			Status:      models.BookingStatusPending,
			BookingType: models.BookingTypeOffline,
			CreatedAt:   time.Date(2026, 4, 18, 10, 0, 0, 0, time.UTC),
		})
		t.Logf("da tao du lieu booking voi trang thai PENDING cho test cap nhat")

		service := &BookingService{
			db:   db,
			roDb: db,
		}

		userID, err := service.UpdateBookingStatus(ctx, "booking-update-success", string(models.BookingStatusConfirmed))
		if err != nil {
			t.Fatalf("expected UpdateBookingStatus to succeed, got %v", err)
		}
		if userID != "user-update-success" {
			t.Fatalf("expected returned user id user-update-success, got %q", userID)
		}

		updated, err := service.GetBookingByID(ctx, "booking-update-success")
		if err != nil {
			t.Fatalf("failed to re-read booking after update: %v", err)
		}
		if updated.Status != models.BookingStatusConfirmed {
			t.Fatalf("expected booking status CONFIRMED after update, got %s", updated.Status)
		}
		t.Logf("UpdateBookingStatus da luu trang thai=%s va tra ve user=%s", updated.Status, userID)
	})
}

func TestBookingService_CreateTicketsForBooking(t *testing.T) {
	ctx := context.Background()

	t.Run("creates one ticket per seat id and returns created count", func(t *testing.T) {
		// Test Case ID: TC-GO-BIZ-030
		// Mục tiêu: CreateTicketsForBooking should create a ticket row per seat with UNUSED status.
		// Kiểm tra DB: this test verifies persisted ticket rows after the service call.
		// Hoàn tác: in-memory DB cleanup guarantees no state leakage.
		db := newSQLiteBookingDB(t)
		service := &BookingService{db: db}

		count, err := service.CreateTicketsForBooking(ctx, "booking-ticket-create", "showtime-ticket-create", []string{"A1", "A2"})
		if err != nil {
			t.Fatalf("expected CreateTicketsForBooking to succeed, got %v", err)
		}
		if count != 2 {
			t.Fatalf("expected 2 created tickets, got %d", count)
		}

		totalTickets, err := db.NewSelect().Table("tickets").Count(ctx)
		if err != nil {
			t.Fatalf("failed to count tickets after create: %v", err)
		}
		if totalTickets != 2 {
			t.Fatalf("expected 2 persisted tickets, got %d", totalTickets)
		}
		t.Logf("CreateTicketsForBooking da tao %d ve va luu %d dong", count, totalTickets)
	})

	t.Run("returns wrapped datastore error when db handle is unavailable", func(t *testing.T) {
		// Test Case ID: TC-GO-BIZ-031
		// Mục tiêu: datastore insert failures should be returned with service context.
		db := newSQLiteBookingDB(t)
		if err := db.Close(); err != nil {
			t.Fatalf("failed to close db for create tickets error path: %v", err)
		}
		service := &BookingService{db: db}

		_, err := service.CreateTicketsForBooking(ctx, "booking-ticket-fail", "showtime-ticket-fail", []string{"B1"})
		if err == nil || !strings.Contains(err.Error(), "failed to create tickets") {
			t.Fatalf("expected wrapped create tickets error, got %v", err)
		}
		t.Logf("CreateTicketsForBooking tra ve loi dung nhu ky vong: %v", err)
	})
}

func TestBookingService_CreateTicketsWithDetails(t *testing.T) {
	ctx := context.Background()

	t.Run("creates tickets and returns enriched booking detail payload", func(t *testing.T) {
		// Test Case ID: TC-GO-BIZ-032
		// Mục tiêu: CreateTicketsWithDetails should combine local ticket creation with movie-service showtime/seat metadata.
		// Kiểm tra DB: the test validates ticket rows are created locally while detail payload is built from grpc responses.
		// Hoàn tác: isolated SQLite DB is cleaned up by test lifecycle.
		db := newSQLiteBookingDB(t)
		seedBookingRecord(t, ctx, db, &models.Booking{
			Id:          "booking-details-success",
			UserId:      "user-details-success",
			ShowtimeId:  "showtime-details-success",
			TotalAmount: 222000,
			Status:      models.BookingStatusConfirmed,
			BookingType: models.BookingTypeOnline,
			CreatedAt:   time.Date(2026, 4, 18, 11, 0, 0, 0, time.UTC),
		})

		fakeMovieService := &fakeMovieServiceServer{
			showtimeResponse: &pb.ShowtimeData{
				Id:           "showtime-details-success",
				MovieTitle:   "Inception",
				ShowtimeDate: "2026-04-20",
				ShowtimeTime: "19:45",
			},
			seatDetailsResponse: []*pb.SeatDetailData{
				{SeatId: "A1", SeatRow: "A", SeatNumber: 1, SeatType: "STANDARD"},
				{SeatId: "A2", SeatRow: "A", SeatNumber: 2, SeatType: "VIP"},
			},
		}
		service := &BookingService{
			db:          db,
			roDb:        db,
			movieClient: newTestMovieClient(t, fakeMovieService),
		}

		result, createdCount, err := service.CreateTicketsWithDetails(ctx, "booking-details-success", []string{"A1", "A2"})
		if err != nil {
			t.Fatalf("expected CreateTicketsWithDetails success path, got %v", err)
		}
		if createdCount != 2 {
			t.Fatalf("expected 2 created tickets, got %d", createdCount)
		}
		if result == nil || result.Showtime.MovieName != "Inception" || len(result.Seats) != 2 {
			t.Fatalf("unexpected CreateTicketsWithDetails result: %+v", result)
		}
		t.Logf("CreateTicketsWithDetails tra ve ket qua=%+v so_luong_tao=%d", result, createdCount)
	})

	t.Run("returns partial count and wrapped showtime error when GetShowtime fails after ticket creation", func(t *testing.T) {
		// Test Case ID: TC-GO-BIZ-033
		// Mục tiêu: when GetShowtime fails, function should return created ticket count for operational visibility.
		db := newSQLiteBookingDB(t)
		seedBookingRecord(t, ctx, db, &models.Booking{
			Id:          "booking-details-showtime-fail",
			UserId:      "user-details-showtime-fail",
			ShowtimeId:  "showtime-details-showtime-fail",
			TotalAmount: 150000,
			Status:      models.BookingStatusPending,
			BookingType: models.BookingTypeOffline,
			CreatedAt:   time.Date(2026, 4, 18, 11, 15, 0, 0, time.UTC),
		})

		service := &BookingService{
			db:          db,
			roDb:        db,
			movieClient: newTestMovieClient(t, &fakeMovieServiceServer{getShowtimeErr: errors.New("movie timeout")}),
		}

		result, createdCount, err := service.CreateTicketsWithDetails(ctx, "booking-details-showtime-fail", []string{"B1"})
		if err == nil || !strings.Contains(err.Error(), "failed to get showtime") {
			t.Fatalf("expected wrapped showtime error, got %v", err)
		}
		if result != nil {
			t.Fatalf("expected nil result when showtime lookup fails, got %+v", result)
		}
		if createdCount != 1 {
			t.Fatalf("expected createdCount=1 before showtime failure, got %d", createdCount)
		}
		t.Logf("CreateTicketsWithDetails tra ve so_luong_tao_mot_phan=%d khi lay showtime that bai", createdCount)
	})
}

func TestBookingService_SearchTickets(t *testing.T) {
	ctx := context.Background()

	t.Run("searches by booking id and enriches ticket payload with booking and seat/showtime metadata", func(t *testing.T) {
		// Test Case ID: TC-GO-BIZ-034
		// Mục tiêu: SearchTickets should resolve booking branch and enrich ticket response with aggregated metadata.
		// Kiểm tra DB: this test seeds bookings/tickets and validates enriched response fields from DB + movie service.
		// Hoàn tác: isolated in-memory DB state is discarded after test completion.
		db := newSQLiteBookingDB(t)
		seedBookingRecord(t, ctx, db, &models.Booking{
			Id:          "booking-search-1",
			UserId:      "user-search-1",
			ShowtimeId:  "showtime-search-1",
			TotalAmount: 175000,
			Status:      models.BookingStatusConfirmed,
			BookingType: models.BookingTypeOnline,
			CreatedAt:   time.Date(2026, 4, 18, 12, 0, 0, 0, time.UTC),
		})
		seedTicketRecord(t, ctx, db, &models.Ticket{
			Id:         "ticket-search-1",
			BookingId:  "booking-search-1",
			ShowtimeId: "showtime-search-1",
			SeatId:     "A1",
			Status:     models.TicketStatusUnused,
			CreatedAt:  time.Date(2026, 4, 18, 12, 1, 0, 0, time.UTC),
		})

		service := &BookingService{
			roDb: db,
			movieClient: newTestMovieClient(t, &fakeMovieServiceServer{
				showtimesResponse: []*pb.ShowtimeData{
					{
						Id:           "showtime-search-1",
						MovieTitle:   "Arrival",
						ShowtimeDate: "2026-04-21",
						ShowtimeTime: "18:00",
					},
				},
				seatDetailsResponse: []*pb.SeatDetailData{
					{SeatId: "A1", SeatRow: "A", SeatNumber: 1, SeatType: "STANDARD"},
				},
			}),
		}

		tickets, err := service.SearchTickets(ctx, "booking-search-1", "")
		if err != nil {
			t.Fatalf("expected SearchTickets booking branch to succeed, got %v", err)
		}
		if len(tickets) != 1 {
			t.Fatalf("expected one enriched ticket, got %d", len(tickets))
		}
		if tickets[0].MovieTitle != "Arrival" || tickets[0].SeatRow != "A" || tickets[0].BookingType != string(models.BookingTypeOnline) {
			t.Fatalf("unexpected enriched ticket response: %+v", tickets[0])
		}
		t.Logf("SearchTickets tra ve ve da bo sung du lieu=%+v", tickets[0])
	})

	t.Run("searches by showtime id and enriches ticket payload from datastore and movie-service", func(t *testing.T) {
		// Test Case ID: TC-GO-BIZ-038
		// Mục tiêu: SearchTickets should resolve showtimeId branch and enrich ticket payload when booking is loaded by ids.
		// Kiểm tra DB: this test seeds bookings/tickets and validates response fields populated from DB + grpc lookups.
		// Hoàn tác: isolated in-memory DB is scoped to this test and disposed by cleanup.
		db := newSQLiteBookingDB(t)
		seedBookingRecord(t, ctx, db, &models.Booking{
			Id:          "booking-search-2",
			UserId:      "user-search-2",
			ShowtimeId:  "showtime-search-2",
			TotalAmount: 195000,
			Status:      models.BookingStatusConfirmed,
			BookingType: models.BookingTypeOffline,
			CreatedAt:   time.Date(2026, 4, 18, 13, 0, 0, 0, time.UTC),
		})
		seedTicketRecord(t, ctx, db, &models.Ticket{
			Id:         "ticket-search-2",
			BookingId:  "booking-search-2",
			ShowtimeId: "showtime-search-2",
			SeatId:     "B3",
			Status:     models.TicketStatusUnused,
			CreatedAt:  time.Date(2026, 4, 18, 13, 1, 0, 0, time.UTC),
		})

		service := &BookingService{
			roDb: db,
			movieClient: newTestMovieClient(t, &fakeMovieServiceServer{
				showtimesResponse: []*pb.ShowtimeData{
					{
						Id:           "showtime-search-2",
						MovieTitle:   "Blade Runner 2049",
						ShowtimeDate: "2026-04-22",
						ShowtimeTime: "20:30",
					},
				},
				seatDetailsResponse: []*pb.SeatDetailData{
					{SeatId: "B3", SeatRow: "B", SeatNumber: 3, SeatType: "VIP"},
				},
			}),
		}

		tickets, err := service.SearchTickets(ctx, "", "showtime-search-2")
		if err != nil {
			t.Fatalf("expected SearchTickets showtime branch to succeed, got %v", err)
		}
		if len(tickets) != 1 {
			t.Fatalf("expected one ticket from showtime search, got %d", len(tickets))
		}
		if tickets[0].BookingType != string(models.BookingTypeOffline) || tickets[0].SeatRow != "B" || tickets[0].MovieTitle != "Blade Runner 2049" {
			t.Fatalf("unexpected showtime-branch enrichment result: %+v", tickets[0])
		}
		t.Logf("SearchTickets(showtimeId) tra ve ve da bo sung du lieu=%+v", tickets[0])
	})

	t.Run("returns datastore error when querying tickets by showtime id fails", func(t *testing.T) {
		// Test Case ID: TC-GO-BIZ-039
		// Mục tiêu: SearchTickets should surface datastore errors from GetTicketsByShowtimeId.
		db := newSQLiteBookingDB(t)
		if err := db.Close(); err != nil {
			t.Fatalf("failed to close readonly DB for showtime error path: %v", err)
		}

		service := &BookingService{
			roDb:        db,
			movieClient: newTestMovieClient(t, &fakeMovieServiceServer{}),
		}

		_, err := service.SearchTickets(ctx, "", "showtime-search-error")
		if err == nil {
			t.Fatal("expected datastore error from SearchTickets showtime branch")
		}
		t.Logf("SearchTickets(showtimeId) tra ve loi datastore dung nhu ky vong: %v", err)
	})

	t.Run("returns datastore error when querying booking with tickets by booking id fails", func(t *testing.T) {
		// Test Case ID: TC-GO-BIZ-042
		// Mục tiêu: SearchTickets should surface datastore errors from GetBookingByIdWithTickets.
		db := newSQLiteBookingDB(t)
		if err := db.Close(); err != nil {
			t.Fatalf("failed to close readonly DB for booking-id error path: %v", err)
		}

		service := &BookingService{
			roDb:        db,
			movieClient: newTestMovieClient(t, &fakeMovieServiceServer{}),
		}

		_, err := service.SearchTickets(ctx, "booking-search-error", "")
		if err == nil {
			t.Fatal("expected datastore error from SearchTickets booking branch")
		}
		if !strings.Contains(err.Error(), "failed to get booking with tickets") {
			t.Fatalf("expected wrapped booking datastore error, got %v", err)
		}
		t.Logf("SearchTickets(bookingId) tra ve loi datastore dung nhu ky vong: %v", err)
	})
}

func TestBookingService_enrichTicketsWithBookingData(t *testing.T) {
	ctx := context.Background()

	t.Run("returns wrapped error when showtime aggregation fails", func(t *testing.T) {
		// Test Case ID: TC-GO-BIZ-035
		// Mục tiêu: enrichTicketsWithBookingData should wrap movie-service showtime failures.
		// Kiểm tra DB: this test seeds booking rows because booking=nil branch must read bookings by ids from datastore.
		// Hoàn tác: in-memory DB is isolated and disposed in cleanup.
		db := newSQLiteBookingDB(t)
		seedBookingRecord(t, ctx, db, &models.Booking{
			Id:          "booking-enrich-fail",
			UserId:      "user-enrich-fail",
			ShowtimeId:  "showtime-enrich-fail",
			TotalAmount: 99000,
			Status:      models.BookingStatusPending,
			BookingType: models.BookingTypeOffline,
			CreatedAt:   time.Date(2026, 4, 18, 12, 10, 0, 0, time.UTC),
		})

		service := &BookingService{
			roDb:        db,
			movieClient: newTestMovieClient(t, &fakeMovieServiceServer{getShowtimesErr: errors.New("showtime backend unavailable")}),
		}

		tickets := []*models.Ticket{
			{
				Id:         "ticket-enrich-fail",
				BookingId:  "booking-enrich-fail",
				ShowtimeId: "showtime-enrich-fail",
				SeatId:     "A6",
				Status:     models.TicketStatusUnused,
				CreatedAt:  time.Date(2026, 4, 18, 12, 11, 0, 0, time.UTC),
			},
		}

		_, err := service.enrichTicketsWithBookingData(ctx, tickets, nil)
		if err == nil || !strings.Contains(err.Error(), "failed to get showtimes") {
			t.Fatalf("expected wrapped showtimes error, got %v", err)
		}
		t.Logf("enrichTicketsWithBookingData tra ve loi showtime dung nhu ky vong: %v", err)
	})

	t.Run("returns wrapped error when loading bookings by ids fails", func(t *testing.T) {
		// Test Case ID: TC-GO-BIZ-043
		// Mục tiêu: enrichTicketsWithBookingData should wrap datastore failures from GetBookingsByIds when booking input is nil.
		db := newSQLiteBookingDB(t)
		if err := db.Close(); err != nil {
			t.Fatalf("failed to close readonly DB for booking lookup error path: %v", err)
		}

		service := &BookingService{
			roDb:        db,
			movieClient: newTestMovieClient(t, &fakeMovieServiceServer{}),
		}

		tickets := []*models.Ticket{
			{
				Id:         "ticket-enrich-bookings-error",
				BookingId:  "booking-enrich-bookings-error",
				ShowtimeId: "showtime-enrich-bookings-error",
				SeatId:     "B9",
				Status:     models.TicketStatusUnused,
				CreatedAt:  time.Date(2026, 4, 18, 12, 12, 0, 0, time.UTC),
			},
		}

		_, err := service.enrichTicketsWithBookingData(ctx, tickets, nil)
		if err == nil || !strings.Contains(err.Error(), "failed to get bookings") {
			t.Fatalf("expected wrapped bookings error, got %v", err)
		}
		t.Logf("enrichTicketsWithBookingData tra ve loi bookings dung nhu ky vong: %v", err)
	})

	t.Run("returns wrapped error when seat-details aggregation fails after showtimes succeed", func(t *testing.T) {
		// Test Case ID: TC-GO-BIZ-044
		// Mục tiêu: enrichTicketsWithBookingData should wrap movie-service seat-details failures after showtime data succeeds.
		service := &BookingService{
			movieClient: newTestMovieClient(t, &fakeMovieServiceServer{
				showtimesResponse: []*pb.ShowtimeData{
					{
						Id:           "showtime-enrich-seat-fail",
						MovieTitle:   "Dune",
						ShowtimeDate: "2026-04-25",
						ShowtimeTime: "21:30",
					},
				},
				getSeatDetailsErr: errors.New("seat details backend unavailable"),
			}),
		}

		tickets := []*models.Ticket{
			{
				Id:         "ticket-enrich-seat-fail",
				BookingId:  "booking-enrich-seat-fail",
				ShowtimeId: "showtime-enrich-seat-fail",
				SeatId:     "C7",
				Status:     models.TicketStatusUnused,
				CreatedAt:  time.Date(2026, 4, 18, 12, 13, 0, 0, time.UTC),
			},
		}
		booking := &models.Booking{
			Id:          "booking-enrich-seat-fail",
			BookingType: models.BookingTypeOnline,
			TotalAmount: 205000,
		}

		_, err := service.enrichTicketsWithBookingData(ctx, tickets, booking)
		if err == nil || !strings.Contains(err.Error(), "failed to get seat details") {
			t.Fatalf("expected wrapped seat-details error, got %v", err)
		}
		t.Logf("enrichTicketsWithBookingData tra ve loi seat-details dung nhu ky vong: %v", err)
	})
}

func TestBookingService_MarkTicketAsUsed(t *testing.T) {
	ctx := context.Background()

	t.Run("marks an existing ticket as USED", func(t *testing.T) {
		// Test Case ID: TC-GO-BIZ-036
		// Mục tiêu: MarkTicketAsUsed should persist ticket status transition to USED.
		// Kiểm tra DB: this test seeds one ticket row and verifies status change after service call.
		// Hoàn tác: test DB state is isolated and removed via in-memory database cleanup.
		db := newSQLiteBookingDB(t)
		seedBookingRecord(t, ctx, db, &models.Booking{
			Id:          "booking-mark-used",
			UserId:      "user-mark-used",
			ShowtimeId:  "showtime-mark-used",
			TotalAmount: 123000,
			Status:      models.BookingStatusConfirmed,
			BookingType: models.BookingTypeOnline,
			CreatedAt:   time.Date(2026, 4, 18, 12, 20, 0, 0, time.UTC),
		})
		seedTicketRecord(t, ctx, db, &models.Ticket{
			Id:         "ticket-mark-used",
			BookingId:  "booking-mark-used",
			ShowtimeId: "showtime-mark-used",
			SeatId:     "C1",
			Status:     models.TicketStatusUnused,
			CreatedAt:  time.Date(2026, 4, 18, 12, 21, 0, 0, time.UTC),
		})

		service := &BookingService{db: db}
		if err := service.MarkTicketAsUsed(ctx, "ticket-mark-used"); err != nil {
			t.Fatalf("expected MarkTicketAsUsed to succeed, got %v", err)
		}

		updated, err := getTicketByID(t, ctx, db, "ticket-mark-used")
		if err != nil {
			t.Fatalf("failed to query updated ticket: %v", err)
		}
		if updated.Status != models.TicketStatusUsed {
			t.Fatalf("expected ticket status USED after MarkTicketAsUsed, got %s", updated.Status)
		}
		t.Logf("MarkTicketAsUsed da doi trang thai ve thanh %s", updated.Status)
	})

	t.Run("rejects empty ticket id input", func(t *testing.T) {
		// Test Case ID: TC-GO-BIZ-037
		// Mục tiêu: service should return ErrInvalidBookingData for empty ticket ids.
		service := &BookingService{db: newSQLiteBookingDB(t)}
		err := service.MarkTicketAsUsed(ctx, "")
		if !errors.Is(err, ErrInvalidBookingData) {
			t.Fatalf("expected ErrInvalidBookingData for empty ticket id, got %v", err)
		}
		t.Logf("MarkTicketAsUsed tu choi ticket id rong dung nhu ky vong")
	})

	t.Run("returns wrapped error when GetTicketById fails", func(t *testing.T) {
		// Test Case ID: TC-GO-BIZ-040
		// Mục tiêu: read failures in GetTicketById must be wrapped and surfaced to the caller.
		db := newSQLiteBookingDB(t)
		if err := db.Close(); err != nil {
			t.Fatalf("failed to close db for get-ticket error path: %v", err)
		}

		service := &BookingService{db: db}
		err := service.MarkTicketAsUsed(ctx, "ticket-get-error")
		if err == nil || !strings.Contains(err.Error(), "failed to get ticket") {
			t.Fatalf("expected wrapped get-ticket error, got %v", err)
		}
		t.Logf("MarkTicketAsUsed tra ve loi lay ve dung nhu ky vong: %v", err)
	})

	t.Run("returns update error when UpdateTicketStatus fails after ticket lookup succeeds", func(t *testing.T) {
		// Test Case ID: TC-GO-BIZ-041
		// Mục tiêu: update failures must propagate after successful ticket lookup to preserve operational visibility.
		db, mock := newMockPostgresDB(t)
		service := &BookingService{db: db}

		mock.ExpectQuery(`SELECT .*FROM .*tickets.*`).
			WillReturnRows(sqlmock.NewRows([]string{"id", "booking_id", "showtime_id", "seat_id", "status", "created_at", "updated_at"}).
				AddRow("ticket-update-error", "booking-update-error", "showtime-update-error", "D5", "UNUSED", time.Date(2026, 4, 18, 13, 10, 0, 0, time.UTC), nil))
		mock.ExpectExec(`UPDATE .*tickets.*`).
			WillReturnError(errors.New("update write blocked"))

		err := service.MarkTicketAsUsed(ctx, "ticket-update-error")
		if err == nil || !strings.Contains(err.Error(), "failed to update ticket status") {
			t.Fatalf("expected wrapped update-ticket error, got %v", err)
		}
		t.Logf("MarkTicketAsUsed tra ve loi cap nhat dung nhu ky vong: %v", err)
	})

	t.Run("returns wrapped sql no-rows error when ticket id does not exist", func(t *testing.T) {
		// Test Case ID: TC-GO-BIZ-045
		// Mục tiêu: MarkTicketAsUsed should preserve the current datastore contract for missing tickets as a wrapped read error.
		db := newSQLiteBookingDB(t)
		service := &BookingService{db: db}

		err := service.MarkTicketAsUsed(ctx, "ticket-not-found")
		if err == nil {
			t.Fatal("expected missing-ticket read error")
		}
		if !strings.Contains(err.Error(), "failed to get ticket") {
			t.Fatalf("expected wrapped get-ticket context, got %v", err)
		}
		if !errors.Is(err, sql.ErrNoRows) {
			t.Fatalf("expected wrapped sql.ErrNoRows, got %v", err)
		}
		t.Logf("MarkTicketAsUsed tra ve loi boc sql.ErrNoRows dung nhu ky vong: %v", err)
	})
}

type fakeMovieServiceServer struct {
	pb.UnimplementedMovieServiceServer
	requestedShowtimeIDs    []string
	requestedShowtimeID     string
	showtimesResponse       []*pb.ShowtimeData
	showtimeResponse        *pb.ShowtimeData
	getShowtimesErr         error
	getShowtimeErr          error
	seatsWithPriceResponse  *pb.GetSeatsWithPriceResponse
	getSeatsWithPriceErr    error
	requestedSeatsWithPrice *seatPriceRequestCapture
	seatDetailsResponse     []*pb.SeatDetailData
	getSeatDetailsErr       error
	requestedSeatDetailIDs  []string
}

func (s *fakeMovieServiceServer) GetShowtime(_ context.Context, req *pb.GetShowtimeRequest) (*pb.GetShowtimeResponse, error) {
	if s.getShowtimeErr != nil {
		return nil, s.getShowtimeErr
	}
	s.requestedShowtimeID = req.GetId()
	return &pb.GetShowtimeResponse{
		Success: true,
		Data:    s.showtimeResponse,
	}, nil
}

func (s *fakeMovieServiceServer) GetShowtimes(_ context.Context, req *pb.GetShowtimesRequest) (*pb.GetShowtimesResponse, error) {
	if s.getShowtimesErr != nil {
		return nil, s.getShowtimesErr
	}
	s.requestedShowtimeIDs = append([]string(nil), req.GetIds()...)
	return &pb.GetShowtimesResponse{
		Success: true,
		Data:    s.showtimesResponse,
	}, nil
}

func (s *fakeMovieServiceServer) GetSeatsWithPrice(_ context.Context, req *pb.GetSeatsWithPriceRequest) (*pb.GetSeatsWithPriceResponse, error) {
	s.requestedSeatsWithPrice = &seatPriceRequestCapture{
		ShowtimeID: req.GetShowtimeId(),
		SeatIDs:    append([]string(nil), req.GetSeatIds()...),
	}
	if s.getSeatsWithPriceErr != nil {
		return nil, s.getSeatsWithPriceErr
	}
	if s.seatsWithPriceResponse == nil {
		return &pb.GetSeatsWithPriceResponse{Success: true}, nil
	}
	return s.seatsWithPriceResponse, nil
}

func (s *fakeMovieServiceServer) GetSeatDetails(_ context.Context, req *pb.GetSeatDetailsRequest) (*pb.GetSeatDetailsResponse, error) {
	if s.getSeatDetailsErr != nil {
		return nil, s.getSeatDetailsErr
	}
	s.requestedSeatDetailIDs = append([]string(nil), req.GetSeatIds()...)
	return &pb.GetSeatDetailsResponse{
		Success: true,
		Data:    s.seatDetailsResponse,
	}, nil
}

type seatPriceRequestCapture struct {
	ShowtimeID string
	SeatIDs    []string
}

type fakeOutboxServiceServer struct {
	pb.UnimplementedOutboxServiceServer
	requests []*pb.CreateOutboxEventRequest
}

func (s *fakeOutboxServiceServer) CreateOutboxEvent(_ context.Context, req *pb.CreateOutboxEventRequest) (*pb.CreateOutboxEventResponse, error) {
	captured := &pb.CreateOutboxEventRequest{
		EventType: req.GetEventType(),
		Payload:   req.GetPayload(),
	}
	s.requests = append(s.requests, captured)
	return &pb.CreateOutboxEventResponse{Success: true, EventId: int32(len(s.requests))}, nil
}

func newTestMovieClient(t *testing.T, server pb.MovieServiceServer) *bookinggrpc.MovieClient {
	t.Helper()

	listener := bufconn.Listen(1024 * 1024)
	grpcServer := gogrpc.NewServer()
	pb.RegisterMovieServiceServer(grpcServer, server)

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
		t.Fatalf("failed to create bufconn gRPC client: %v", err)
	}

	t.Cleanup(func() {
		_ = conn.Close()
	})

	movieClient := &bookinggrpc.MovieClient{}
	setUnexportedField(movieClient, "conn", conn)
	setUnexportedField(movieClient, "client", pb.NewMovieServiceClient(conn))
	return movieClient
}

func newTestOutboxClient(t *testing.T, server pb.OutboxServiceServer) *bookinggrpc.OutboxClient {
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

	outboxClient := &bookinggrpc.OutboxClient{}
	setUnexportedField(outboxClient, "conn", conn)
	setUnexportedField(outboxClient, "client", pb.NewOutboxServiceClient(conn))
	return outboxClient
}

func setUnexportedField(target any, fieldName string, value any) {
	field := reflect.ValueOf(target).Elem().FieldByName(fieldName)
	reflect.NewAt(field.Type(), unsafe.Pointer(field.UnsafeAddr())).Elem().Set(reflect.ValueOf(value))
}

func newTestRedisClient(t *testing.T) *redis.Client {
	t.Helper()

	server := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: server.Addr()})

	t.Cleanup(func() {
		_ = client.Close()
	})

	return client
}

type commandErrorHook struct {
	command string
	err     error
}

func (h commandErrorHook) DialHook(next redis.DialHook) redis.DialHook {
	return next
}

func (h commandErrorHook) ProcessHook(next redis.ProcessHook) redis.ProcessHook {
	return func(ctx context.Context, cmd redis.Cmder) error {
		if strings.EqualFold(cmd.Name(), h.command) {
			return h.err
		}
		return next(ctx, cmd)
	}
}

func (h commandErrorHook) ProcessPipelineHook(next redis.ProcessPipelineHook) redis.ProcessPipelineHook {
	return func(ctx context.Context, cmds []redis.Cmder) error {
		for _, cmd := range cmds {
			if strings.EqualFold(cmd.Name(), h.command) {
				return h.err
			}
		}
		return next(ctx, cmds)
	}
}

func newSQLiteBookingDB(t *testing.T) *bun.DB {
	t.Helper()

	sqlDB, err := sql.Open("sqlite3", "file:booking-service-test?mode=memory&cache=shared")
	if err != nil {
		t.Fatalf("failed to open SQLite DB: %v", err)
	}

	db := bun.NewDB(sqlDB, sqlitedialect.New())
	t.Cleanup(func() {
		_ = db.Close()
	})

	ctx := context.Background()
	if _, err := db.NewRaw(`
		CREATE TABLE IF NOT EXISTS bookings (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			showtime_id TEXT NOT NULL,
			total_amount REAL NOT NULL,
			status TEXT NOT NULL,
			staff_id TEXT,
			booking_type TEXT NOT NULL,
			created_at TIMESTAMP,
			updated_at TIMESTAMP
		)
	`).Exec(ctx); err != nil {
		t.Fatalf("failed to create bookings table: %v", err)
	}
	if _, err := db.NewRaw(`
		CREATE TABLE IF NOT EXISTS tickets (
			id TEXT PRIMARY KEY,
			booking_id TEXT NOT NULL,
			showtime_id TEXT NOT NULL,
			seat_id TEXT NOT NULL,
			status TEXT NOT NULL,
			created_at TIMESTAMP,
			updated_at TIMESTAMP
		)
	`).Exec(ctx); err != nil {
		t.Fatalf("failed to create tickets table: %v", err)
	}

	return db
}

func newMockPostgresDB(t *testing.T) (*bun.DB, sqlmock.Sqlmock) {
	t.Helper()

	sqlDB, mock, err := sqlmock.New(sqlmock.QueryMatcherOption(sqlmock.QueryMatcherRegexp))
	if err != nil {
		t.Fatalf("failed to create sqlmock DB: %v", err)
	}

	db := bun.NewDB(sqlDB, pgdialect.New())
	t.Cleanup(func() {
		if err := mock.ExpectationsWereMet(); err != nil {
			t.Fatalf("unmet sqlmock expectations: %v", err)
		}
		_ = db.Close()
	})

	return db, mock
}

func seedBookedSeat(t *testing.T, ctx context.Context, db *bun.DB, bookingID, showtimeID, seatID string) {
	t.Helper()

	if _, err := db.NewRaw(
		"INSERT INTO bookings (id, user_id, showtime_id, total_amount, status, booking_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
		bookingID,
		"user-db-1",
		showtimeID,
		120000.0,
		models.BookingStatusConfirmed,
		models.BookingTypeOnline,
		time.Date(2026, 4, 17, 12, 0, 0, 0, time.UTC),
	).Exec(ctx); err != nil {
		t.Fatalf("failed to insert booking seed: %v", err)
	}

	if _, err := db.NewRaw(
		"INSERT INTO tickets (id, booking_id, showtime_id, seat_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
		"ticket-db-1",
		bookingID,
		showtimeID,
		seatID,
		models.TicketStatusUnused,
		time.Date(2026, 4, 17, 12, 1, 0, 0, time.UTC),
	).Exec(ctx); err != nil {
		t.Fatalf("failed to insert ticket seed: %v", err)
	}
}

func seedBookingRecord(t *testing.T, ctx context.Context, db *bun.DB, booking *models.Booking) {
	t.Helper()

	if _, err := db.NewRaw(
		"INSERT INTO bookings (id, user_id, showtime_id, total_amount, status, staff_id, booking_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
		booking.Id,
		booking.UserId,
		booking.ShowtimeId,
		booking.TotalAmount,
		booking.Status,
		booking.StaffId,
		booking.BookingType,
		booking.CreatedAt,
		booking.UpdatedAt,
	).Exec(ctx); err != nil {
		t.Fatalf("failed to insert booking record: %v", err)
	}
}

func seedTicketRecord(t *testing.T, ctx context.Context, db *bun.DB, ticket *models.Ticket) {
	t.Helper()

	if _, err := db.NewRaw(
		"INSERT INTO tickets (id, booking_id, showtime_id, seat_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
		ticket.Id,
		ticket.BookingId,
		ticket.ShowtimeId,
		ticket.SeatId,
		ticket.Status,
		ticket.CreatedAt,
		ticket.UpdatedAt,
	).Exec(ctx); err != nil {
		t.Fatalf("failed to insert ticket record: %v", err)
	}
}

func getTicketByID(t *testing.T, ctx context.Context, db *bun.DB, ticketID string) (*models.Ticket, error) {
	t.Helper()

	ticket := new(models.Ticket)
	if err := db.NewSelect().
		Model(ticket).
		Where("id = ?", ticketID).
		Scan(ctx); err != nil {
		return nil, err
	}

	return ticket, nil
}

func getBookedSeatsForShowtime(t *testing.T, ctx context.Context, db *bun.DB, showtimeID string) (map[string]string, error) {
	t.Helper()

	var results []struct {
		SeatID    string `bun:"seat_id"`
		BookingID string `bun:"booking_id"`
	}
	err := db.NewSelect().
		TableExpr("tickets t").
		Column("t.seat_id", "t.booking_id").
		Join("INNER JOIN bookings b ON b.id = t.booking_id").
		Where("b.showtime_id = ?", showtimeID).
		Where("b.status IN (?, ?)", models.BookingStatusPending, models.BookingStatusConfirmed).
		Scan(ctx, &results)
	if err != nil {
		return nil, err
	}

	bookedSeats := make(map[string]string, len(results))
	for _, result := range results {
		bookedSeats[result.SeatID] = result.BookingID
	}

	return bookedSeats, nil
}
