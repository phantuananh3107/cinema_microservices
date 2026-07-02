package outbox

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"worker-service/internal/datastore"
	"worker-service/internal/grpc"
	"worker-service/internal/models"
	"worker-service/internal/pkg/logger"
	"worker-service/internal/pkg/pubsub"

	"github.com/redis/go-redis/v9"
	"github.com/samber/do"
)

type Worker struct {
	logger        logger.Logger
	pubsub        pubsub.PubSub
	redisClient   redis.UniversalClient
	bookingClient *grpc.BookingClient
	userClient    *grpc.UserClient
	movieClient   *grpc.MovieClient
	outboxRepo    datastore.OutboxRepository
}

func NewWorker(ctn *do.Injector) (*Worker, error) {
	log, err := do.Invoke[logger.Logger](ctn)
	if err != nil {
		return nil, err
	}

	pubsub, err := do.Invoke[pubsub.PubSub](ctn)
	if err != nil {
		return nil, err
	}

	redisClient, err := do.InvokeNamed[redis.UniversalClient](ctn, "redis-db")
	if err != nil {
		return nil, err
	}

	outboxRepo, err := do.Invoke[datastore.OutboxRepository](ctn)
	if err != nil {
		return nil, fmt.Errorf("failed to get outbox repository: %w", err)
	}

	bookingClient, err := grpc.NewBookingClient()
	if err != nil {
		return nil, fmt.Errorf("failed to create booking client: %w", err)
	}

	userClient, err := grpc.NewUserClient()
	if err != nil {
		return nil, fmt.Errorf("failed to create user client: %w", err)
	}

	movieClient, err := grpc.NewMovieClient()
	if err != nil {
		return nil, fmt.Errorf("failed to create movie client: %w", err)
	}

	return &Worker{
		logger:        log,
		pubsub:        pubsub,
		redisClient:   redisClient,
		outboxRepo:    outboxRepo,
		bookingClient: bookingClient,
		userClient:    userClient,
		movieClient:   movieClient,
	}, nil
}

func (w *Worker) Start(ctx context.Context) error {
	w.logger.Info("Starting outbox worker...")

	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			w.logger.Info("Outbox worker stopped")
			return ctx.Err()
		case <-ticker.C:
			if err := w.processEvents(ctx); err != nil {
				w.logger.Error("Failed to process outbox events: %v", err)
			}
		}
	}
}

func (w *Worker) processEvents(ctx context.Context) error {
	events, err := w.outboxRepo.GetPendingEvents(ctx, 100)
	if err != nil {
		return err
	}

	if len(events) == 0 {
		return nil
	}

	w.logger.Debug("Processing %d outbox events", len(events))

	for _, event := range events {
		if err = w.processEvent(ctx, event); err != nil {
			err = w.markEventAsFailed(ctx, event.ID, err)
			if err != nil {
				return err
			}
			continue
		}

		if err = w.markEventAsSent(ctx, event.ID); err != nil {
			w.logger.Error("Failed to mark event %d as sent: %v", event.ID, err)
		}
	}

	return nil
}

func (w *Worker) processEvent(ctx context.Context, event models.OutboxEvent) error {
	w.logger.Debug("Processing event: %s - %s", event.EventType, event.Payload)

	switch event.EventType {
	case models.EventTypeBookingCreated:
		return w.handleBookingCreated(ctx, event)
	case models.EventTypePaymentCompleted:
		return w.handlePaymentCompleted(ctx, event)
	default:
		w.logger.Warn("Unknown event type: %s", event.EventType)
		return nil
	}
}

func (w *Worker) handleBookingCreated(ctx context.Context, event models.OutboxEvent) error {
	data := new(models.BookingEventData)
	if err := json.Unmarshal([]byte(event.Payload), data); err != nil {
		return fmt.Errorf("failed to unmarshal payload: %w", err)
	}

	bookingID := data.BookingId
	seatIds := data.SeatIds
	showtimeId := data.ShowtimeId

	for _, seatId := range seatIds {
		lockKey := fmt.Sprintf("seat_lock:%s:%s", showtimeId, seatId)

		if err := w.redisClient.Set(ctx, lockKey, bookingID, 5*time.Minute).Err(); err != nil {
			w.logger.Error("Failed to cache seat lock %s: %v", lockKey, err)
		}
	}

	w.logger.Info("Successfully cached seat locks for booking %s with %d seats", bookingID, len(seatIds))
	return nil
}

func (w *Worker) handlePaymentCompleted(ctx context.Context, event models.OutboxEvent) error {
	var data map[string]interface{}
	if err := json.Unmarshal([]byte(event.Payload), &data); err != nil {
		return fmt.Errorf("failed to unmarshal payload: %w", err)
	}

	paymentID, ok := data["payment_id"].(string)
	if !ok {
		return fmt.Errorf("missing or invalid payment_id")
	}

	bookingID, ok := data["booking_id"].(string)
	if !ok {
		return fmt.Errorf("missing or invalid booking_id")
	}

	amount, ok := data["amount"].(float64)
	if !ok {
		amountInt, ok := data["amount"].(int)
		if !ok {
			return fmt.Errorf("missing or invalid amount")
		}
		amount = float64(amountInt)
	}

	bookingEvent, err := w.outboxRepo.GetBookingEventByBookingID(ctx, bookingID)
	if err != nil {
		return fmt.Errorf("failed to get booking event: %w", err)
	}

	bookingEventData := new(models.BookingEventData)
	if err = json.Unmarshal([]byte(bookingEvent.Payload), bookingEventData); err != nil {
		return fmt.Errorf("failed to unmarshal booking event data: %w", err)
	}

	if len(bookingEventData.SeatIds) == 0 {
		return fmt.Errorf("no seats found for booking %s", bookingID)
	}

	resp, err := w.bookingClient.UpdateBookingStatusWithResponse(ctx, bookingID, "CONFIRMED")
	if err != nil {
		return err
	}

	if err = w.extendSeatLocksUntilMovieEnds(ctx, bookingEventData); err != nil {
		w.logger.Error("Failed to extend seat locks for booking %s: %v", bookingID, err)
	}

	userID := resp.UserId
	userEmail, err := w.userClient.GetUserEmailById(ctx, userID)
	if err != nil {
		return err
	}

	ticketResp, err := w.bookingClient.CreateTicketsWithDetails(ctx, bookingID, bookingEventData.SeatIds)
	if err != nil {
		w.logger.Error("Failed to create tickets for booking %s: %v", bookingID, err)
	}

	notificationData := map[string]interface{}{
		"user_id":    userID,
		"booking_id": bookingID,
		"payment_id": paymentID,
		"amount":     amount,
		"status":     "COMPLETED",
		"timestamp":  time.Now().Unix(),
		"title":      "Payment Successful",
		"message":    fmt.Sprintf("Your booking %s has been confirmed. Payment of %.2f VND received.", bookingID, amount),
	}

	emailData := map[string]interface{}{
		"user_id":    userID,
		"user_email": userEmail,
		"to":         userEmail,
		"booking_id": bookingID,
	}

	if ticketResp != nil && ticketResp.BookingDetails != nil {
		details := ticketResp.BookingDetails

		if len(details.Seats) > 0 {
			seats := make([]map[string]interface{}, 0, len(details.Seats))
			for _, seat := range details.Seats {
				seats = append(seats, map[string]interface{}{
					"seat_row":    seat.SeatRow,
					"seat_number": seat.SeatNumber,
					"seat_type":   seat.SeatType,
				})
			}
			emailData["seats"] = seats
		}

		if details.Showtime != nil {
			emailData["showtime"] = map[string]interface{}{
				"showtime_id": details.Showtime.ShowtimeId,
				"start_time":  details.Showtime.StartTime,
				"movie_name":  details.Showtime.MovieName,
				"room_name":   details.Showtime.RoomName,
			}
		}
	}

	emailMessage := &pubsub.Message{
		Topic: "booking_success",
		Data:  emailData,
	}
	_ = w.pubsub.Publish(ctx, emailMessage)

	userNotificationTopic := fmt.Sprintf("booking_%s", userID)
	userMessage := &pubsub.Message{
		Topic: userNotificationTopic,
		Data:  notificationData,
	}

	return w.pubsub.Publish(ctx, userMessage)
}

func (w *Worker) extendSeatLocksUntilMovieEnds(ctx context.Context, eventData *models.BookingEventData) error {
	showtimeData, err := w.movieClient.GetShowtime(ctx, eventData.ShowtimeId)
	if err != nil {
		return fmt.Errorf("failed to get showtime data: %w", err)
	}

	showtimeStr := fmt.Sprintf("%s %s", showtimeData.ShowtimeDate, showtimeData.ShowtimeTime)
	showtimeStart, err := time.Parse("2006-01-02 15:04:05", showtimeStr)
	if err != nil {
		return fmt.Errorf("failed to parse showtime: %w", err)
	}

	duration := time.Second * time.Duration(showtimeData.DurationSeconds)
	movieEndTime := showtimeStart.Add(duration)
	ttl := time.Until(movieEndTime)

	for _, seatId := range eventData.SeatIds {
		lockKey := fmt.Sprintf("seat_lock:%s:%s", eventData.ShowtimeId, seatId)

		err = w.redisClient.Expire(ctx, lockKey, ttl).Err()
		if err != nil {
			return fmt.Errorf("failed to extend lock for seat %s: %w", seatId, err)
		}
	}

	return nil
}

func (w *Worker) markEventAsSent(ctx context.Context, eventID int) error {
	return w.outboxRepo.MarkEventAsSent(ctx, eventID)
}

func (w *Worker) markEventAsFailed(ctx context.Context, eventID int, _ error) error {
	return w.outboxRepo.MarkEventAsFailed(ctx, eventID)
}
