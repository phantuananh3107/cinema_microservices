package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"booking-service/internal/datastore"
	"booking-service/internal/grpc"
	"booking-service/internal/models"
	"booking-service/internal/types"
	"booking-service/proto/pb"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/samber/do"
	"github.com/sirupsen/logrus"
	"github.com/uptrace/bun"
)

var (
	ErrInvalidBookingData = fmt.Errorf("invalid booking data")
	ErrBookingNotFound    = fmt.Errorf("booking not found")
	ErrTicketNotFound     = fmt.Errorf("ticket not found")
	ErrSeatAlreadyLocked  = fmt.Errorf("one or more seats are already locked")
	ErrSeatAlreadyBooked  = fmt.Errorf("one or more seats are already booked")
)

type BookingService struct {
	container    *do.Injector
	db           *bun.DB
	roDb         *bun.DB
	movieClient  *grpc.MovieClient
	outboxClient *grpc.OutboxClient
	redisClient  redis.UniversalClient
}

func NewBookingService(container *do.Injector) (*BookingService, error) {
	db, err := do.Invoke[*bun.DB](container)
	if err != nil {
		return nil, err
	}

	roDb, err := do.InvokeNamed[*bun.DB](container, "readonly-db")
	if err != nil {
		return nil, err
	}

	movieClient, err := do.Invoke[*grpc.MovieClient](container)
	if err != nil {
		return nil, err
	}

	outboxClient, err := do.Invoke[*grpc.OutboxClient](container)
	if err != nil {
		return nil, err
	}

	redisClient, err := do.InvokeNamed[redis.UniversalClient](container, "redis-db")
	if err != nil {
		return nil, err
	}

	return &BookingService{
		container:    container,
		db:           db,
		roDb:         roDb,
		movieClient:  movieClient,
		outboxClient: outboxClient,
		redisClient:  redisClient,
	}, nil
}

func (s *BookingService) normalizePagination(page, size int) (int, int, int, int) {
	if page <= 0 {
		page = 1
	}
	if size <= 0 {
		size = 10
	}
	if size > 100 {
		size = 100
	}
	limit := size
	offset := (page - 1) * size
	return page, size, limit, offset
}

func (s *BookingService) GetUserBookings(ctx context.Context, userId string, page, size int, status string) ([]*types.BookingHistory, int, error) {
	page, size, limit, offset := s.normalizePagination(page, size)

	var bookings []*models.Booking
	var total int
	var err error

	if status != "" && s.isValidStatus(status) {
		bookingStatus := models.BookingStatus(status)
		bookings, err = datastore.GetBookingsByUserIdAndStatus(ctx, s.roDb, userId, bookingStatus, limit, offset)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to get bookings by status: %w", err)
		}

		total, err = datastore.GetTotalBookingsByUserIdAndStatus(ctx, s.roDb, userId, bookingStatus)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to get total count by status: %w", err)
		}

		enrichedBookings, err := s.enrichBookingsWithShowtimeData(ctx, bookings)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to enrich bookings: %w", err)
		}

		return enrichedBookings, total, nil
	}

	bookings, err = datastore.GetBookingsByUserId(ctx, s.roDb, userId, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get bookings: %w", err)
	}

	enrichedBookings, err := s.enrichBookingsWithShowtimeData(ctx, bookings)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to enrich bookings: %w", err)
	}

	return enrichedBookings, total, nil
}

func (s *BookingService) enrichBookingsWithShowtimeData(ctx context.Context, bookings []*models.Booking) ([]*types.BookingHistory, error) {
	showtimeIds := make([]string, 0, len(bookings))
	for _, booking := range bookings {
		showtimeIds = append(showtimeIds, booking.ShowtimeId)
	}

	showtimes, err := s.movieClient.GetShowtimes(ctx, showtimeIds)
	if err != nil {
		return nil, fmt.Errorf("failed to get showtime data: %w", err)
	}

	showtimeMap := make(map[string]*pb.ShowtimeData)
	for _, showtime := range showtimes {
		showtimeMap[showtime.Id] = showtime
	}

	bookingHistories := make([]*types.BookingHistory, 0, len(bookings))
	for _, booking := range bookings {
		history := &types.BookingHistory{
			Id:          booking.Id,
			UserId:      booking.UserId,
			ShowtimeId:  booking.ShowtimeId,
			TotalAmount: booking.TotalAmount,
			Status:      string(booking.Status),
			StaffId:     booking.StaffId,
			BookingType: string(booking.BookingType),
			CreatedAt:   booking.CreatedAt,
			UpdatedAt:   booking.UpdatedAt,
		}

		if showtime, exists := showtimeMap[booking.ShowtimeId]; exists {
			history.MovieTitle = showtime.MovieTitle
			history.ShowtimeDate = showtime.ShowtimeDate
			history.ShowtimeTime = showtime.ShowtimeTime
			history.SeatNumbers = strings.Join(showtime.SeatNumbers, ", ")
		}

		bookingHistories = append(bookingHistories, history)
	}

	return bookingHistories, nil
}

func (s *BookingService) isValidStatus(status string) bool {
	switch models.BookingStatus(status) {
	case models.BookingStatusPending,
		models.BookingStatusConfirmed,
		models.BookingStatusCancelled:
		return true
	default:
		return false
	}
}

func (s *BookingService) checkSeatAvailability(ctx context.Context, showtimeId string, seatIds []string, userId string) error {
	for _, seatId := range seatIds {
		concurrentLockKey := fmt.Sprintf("seat:concurrent_lock:%s:%s", showtimeId, seatId)
		lockValue, err := s.redisClient.Get(ctx, concurrentLockKey).Result()
		if err != nil && !errors.Is(err, redis.Nil) {
			return err
		}
		if lockValue != "" && lockValue != userId {
			return ErrSeatAlreadyLocked
		}

		seatLockKey := fmt.Sprintf("seat_lock:%s:%s", showtimeId, seatId)
		exists, err := s.redisClient.Exists(ctx, seatLockKey).Result()
		if err != nil {
			return err
		}
		if exists > 0 {
			return ErrSeatAlreadyBooked
		}
	}

	bookedSeats, err := datastore.GetBookedSeatsForShowtime(ctx, s.roDb, showtimeId)
	if err != nil {
		return fmt.Errorf("failed to check booked seats: %w", err)
	}

	for _, seatId := range seatIds {
		if _, alreadyBooked := bookedSeats[seatId]; alreadyBooked {
			return ErrSeatAlreadyBooked
		}
	}

	return nil
}

func (s *BookingService) CreateBooking(ctx context.Context, userId string, showtimeId string, seatIds []string, totalAmount int, bookingType models.BookingType) (*models.Booking, error) {
	if err := s.checkSeatAvailability(ctx, showtimeId, seatIds, userId); err != nil {
		return nil, err
	}

	lockDuration := 5 * time.Minute
	_, err := s.acquireDistributedSeatLocks(ctx, showtimeId, seatIds, userId, lockDuration)
	if err != nil {
		return nil, err
	}

	seatsWithPrice, err := s.movieClient.GetSeatsWithPrice(ctx, showtimeId, seatIds)
	if err != nil {
		return nil, fmt.Errorf("failed to validate seat prices: %w", err)
	}

	for _, seat := range seatsWithPrice.Data {
		if !seat.Available {
			return nil, fmt.Errorf("seat %s (%s) is not available", seat.SeatNumber, seat.SeatId)
		}
	}

	expectedTotal := seatsWithPrice.TotalAmount

	if bookingType == models.BookingTypeOnline {
		clientTotal := float64(totalAmount)
		if clientTotal < expectedTotal-0.01 || clientTotal > expectedTotal+0.01 {
			return nil, fmt.Errorf("invalid total amount: expected %.2f, got %.2f", expectedTotal, clientTotal)
		}
	}

	booking := &models.Booking{
		Id:          uuid.New().String(),
		UserId:      userId,
		ShowtimeId:  showtimeId,
		TotalAmount: expectedTotal,
		Status:      models.BookingStatusPending,
		BookingType: bookingType,
	}

	eventData := &models.BookingEventData{
		BookingId:   booking.Id,
		UserId:      booking.UserId,
		ShowtimeId:  booking.ShowtimeId,
		SeatIds:     seatIds,
		TotalAmount: booking.TotalAmount,
		Status:      booking.Status,
	}

	err = s.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		return datastore.CreateBooking(ctx, tx, booking)
	})
	if err != nil {
		return nil, err
	}

	_ = s.outboxClient.CreateOutboxEvent(ctx, string(models.EventTypeBookingCreated), eventData)

	return booking, nil
}

func (s *BookingService) acquireDistributedSeatLocks(ctx context.Context, showtimeId string, seatIds []string, userId string, lockDuration time.Duration) ([]string, error) {
	lockedKeys := make([]string, 0)

	for _, seatId := range seatIds {
		lockKey := fmt.Sprintf("seat:concurrent_lock:%s:%s", showtimeId, seatId)

		acquired, err := s.redisClient.SetNX(ctx, lockKey, userId, lockDuration).Result()
		if err != nil {
			s.releaseDistributedSeatLocks(ctx, lockedKeys)
			return nil, fmt.Errorf("failed to acquire distributed lock for seat %s: %w", seatId, err)
		}

		if !acquired {
			s.releaseDistributedSeatLocks(ctx, lockedKeys)
			return nil, fmt.Errorf("%w: seat %s is currently being processed", ErrSeatAlreadyLocked, seatId)
		}
		lockedKeys = append(lockedKeys, lockKey)
	}

	return lockedKeys, nil
}

func (s *BookingService) releaseDistributedSeatLocks(ctx context.Context, lockKeys []string) {
	for _, key := range lockKeys {
		if err := s.redisClient.Del(ctx, key).Err(); err != nil {
			logrus.WithError(err).WithField("lock_key", key).Error("Failed to release distributed lock")
		}
	}
}

func (s *BookingService) GetBookingByID(ctx context.Context, bookingId string) (*models.Booking, error) {
	booking, err := datastore.GetBookingById(ctx, s.roDb, bookingId)
	if err != nil {
		return nil, ErrBookingNotFound
	}

	return booking, nil
}

func (s *BookingService) UpdateBookingStatus(ctx context.Context, bookingId string, status string) (string, error) {
	if !s.isValidStatus(status) {
		return "", fmt.Errorf("invalid booking status: %s", status)
	}

	err := datastore.UpdateBookingStatus(ctx, s.db, bookingId, models.BookingStatus(status))
	if err != nil {
		return "", fmt.Errorf("failed to update booking status: %w", err)
	}

	booking, err := datastore.GetBookingById(ctx, s.roDb, bookingId)
	if err != nil {
		return "", fmt.Errorf("failed to get booking: %w", err)
	}

	return booking.UserId, nil
}

type BookingDetailsResult struct {
	BookingId string
	UserEmail string
	Seats     []SeatDetail
	Showtime  ShowtimeDetail
}

type SeatDetail struct {
	SeatRow    string
	SeatNumber int
	SeatType   string
}

type ShowtimeDetail struct {
	ShowtimeId string
	StartTime  string
	MovieName  string
	RoomName   string
}

func (s *BookingService) CreateTicketsForBooking(ctx context.Context, bookingId, showtimeId string, seatIds []string) (int, error) {
	tickets := make([]*models.Ticket, 0, len(seatIds))
	for _, seatId := range seatIds {
		ticket := &models.Ticket{
			Id:         uuid.New().String(),
			BookingId:  bookingId,
			ShowtimeId: showtimeId,
			SeatId:     seatId,
			Status:     models.TicketStatusUnused,
		}
		tickets = append(tickets, ticket)
	}

	if err := datastore.CreateTickets(ctx, s.db, tickets); err != nil {
		return 0, fmt.Errorf("failed to create tickets: %w", err)
	}

	return len(tickets), nil
}

func (s *BookingService) CreateTicketsWithDetails(ctx context.Context, bookingId string, seatIds []string) (*BookingDetailsResult, int, error) {
	booking, err := datastore.GetBookingById(ctx, s.roDb, bookingId)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get booking: %w", err)
	}

	ticketsCreated, err := s.CreateTicketsForBooking(ctx, bookingId, booking.ShowtimeId, seatIds)
	if err != nil {
		return nil, 0, err
	}

	showtimeData, err := s.movieClient.GetShowtime(ctx, booking.ShowtimeId)
	if err != nil {
		return nil, ticketsCreated, fmt.Errorf("failed to get showtime: %w", err)
	}

	seats, err := s.movieClient.GetSeatDetails(ctx, seatIds)
	if err != nil {
		return nil, ticketsCreated, fmt.Errorf("failed to get seat details: %w", err)
	}

	seatDetails := make([]SeatDetail, 0, len(seats))
	for _, seat := range seats {
		seatDetails = append(seatDetails, SeatDetail{
			SeatRow:    seat.SeatRow,
			SeatNumber: int(seat.SeatNumber),
			SeatType:   seat.SeatType,
		})
	}

	showtimeDetail := ShowtimeDetail{
		ShowtimeId: showtimeData.Id,
		StartTime:  fmt.Sprintf("%s %s", showtimeData.ShowtimeDate, showtimeData.ShowtimeTime),
		MovieName:  showtimeData.MovieTitle,
	}

	result := &BookingDetailsResult{
		BookingId: bookingId,
		Seats:     seatDetails,
		Showtime:  showtimeDetail,
	}

	return result, ticketsCreated, nil
}

func (s *BookingService) SearchTickets(ctx context.Context, bookingId, showtimeId string) ([]*types.TicketWithBookingInfo, error) {
	var tickets []*models.Ticket
	var booking *models.Booking

	if bookingId != "" {
		var err error
		booking, err = datastore.GetBookingByIdWithTickets(ctx, s.roDb, bookingId)
		if err != nil {
			return nil, err
		}
		tickets = booking.Ticket
	} else if showtimeId != "" {
		var err error
		tickets, err = datastore.GetTicketsByShowtimeId(ctx, s.roDb, showtimeId)
		if err != nil {
			return nil, err
		}
	}

	return s.enrichTicketsWithBookingData(ctx, tickets, booking)
}

func (s *BookingService) enrichTicketsWithBookingData(ctx context.Context, tickets []*models.Ticket, booking *models.Booking) ([]*types.TicketWithBookingInfo, error) {
	showtimeIds := make([]string, 0, len(tickets))
	seatIds := make([]string, 0, len(tickets))

	for _, ticket := range tickets {
		showtimeIds = append(showtimeIds, ticket.ShowtimeId)
		seatIds = append(seatIds, ticket.SeatId)
	}

	var bookingMap map[string]*models.Booking

	if booking != nil {
		bookingMap = map[string]*models.Booking{booking.Id: booking}
	} else {
		bookingIds := make([]string, 0, len(tickets))
		for _, ticket := range tickets {
			bookingIds = append(bookingIds, ticket.BookingId)
		}

		bookings, err := datastore.GetBookingsByIds(ctx, s.roDb, bookingIds)
		if err != nil {
			return nil, fmt.Errorf("failed to get bookings: %w", err)
		}

		bookingMap = make(map[string]*models.Booking)
		for _, b := range bookings {
			bookingMap[b.Id] = b
		}
	}

	showtimes, err := s.movieClient.GetShowtimes(ctx, showtimeIds)
	if err != nil {
		return nil, fmt.Errorf("failed to get showtimes: %w", err)
	}

	showtimeMap := make(map[string]*pb.ShowtimeData)
	for _, showtime := range showtimes {
		showtimeMap[showtime.Id] = showtime
	}

	seats, err := s.movieClient.GetSeatDetails(ctx, seatIds)
	if err != nil {
		return nil, fmt.Errorf("failed to get seat details: %w", err)
	}

	seatMap := make(map[string]*pb.SeatDetailData)
	for _, seat := range seats {
		seatMap[seat.SeatId] = seat
	}

	enrichedTickets := make([]*types.TicketWithBookingInfo, 0, len(tickets))
	for _, ticket := range tickets {
		enrichedTicket := &types.TicketWithBookingInfo{
			Id:         ticket.Id,
			BookingId:  ticket.BookingId,
			ShowtimeId: ticket.ShowtimeId,
			SeatId:     ticket.SeatId,
			Status:     string(ticket.Status),
			CreatedAt:  ticket.CreatedAt,
			UpdatedAt:  ticket.UpdatedAt,
		}

		if booking, exists := bookingMap[ticket.BookingId]; exists {
			enrichedTicket.BookingType = string(booking.BookingType)
			enrichedTicket.TotalAmount = booking.TotalAmount
		}

		if showtime, exists := showtimeMap[ticket.ShowtimeId]; exists {
			enrichedTicket.MovieTitle = showtime.MovieTitle
			enrichedTicket.ShowtimeDate = showtime.ShowtimeDate
			enrichedTicket.ShowtimeTime = showtime.ShowtimeTime
		}

		if seat, exists := seatMap[ticket.SeatId]; exists {
			enrichedTicket.SeatRow = seat.SeatRow
			enrichedTicket.SeatNumber = fmt.Sprintf("%d", seat.SeatNumber)
			enrichedTicket.SeatType = seat.SeatType
		}

		enrichedTickets = append(enrichedTickets, enrichedTicket)
	}

	return enrichedTickets, nil
}

func (s *BookingService) MarkTicketAsUsed(ctx context.Context, ticketId string) error {
	if ticketId == "" {
		return ErrInvalidBookingData
	}

	ticket, err := datastore.GetTicketById(ctx, s.db, ticketId)
	if err != nil {
		return fmt.Errorf("failed to get ticket: %w", err)
	}
	if ticket == nil {
		return ErrTicketNotFound
	}

	return datastore.UpdateTicketStatus(ctx, s.db, ticketId, models.TicketStatusUsed)
}
