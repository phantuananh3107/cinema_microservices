package outbox

import (
	"context"
	"encoding/json"
	"errors"
	"net"
	"reflect"
	"strings"
	"testing"
	"time"
	"unsafe"

	"worker-service/internal/datastore"
	workergrpc "worker-service/internal/grpc"
	"worker-service/internal/models"
	"worker-service/internal/pkg/logger"
	"worker-service/internal/pkg/pubsub"
	pb "worker-service/proto/pb"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	gogrpc "google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/test/bufconn"
)

type fakeWorkerLogger struct{}

func (f *fakeWorkerLogger) Info(string, ...interface{})  {}
func (f *fakeWorkerLogger) Error(string, ...interface{}) {}
func (f *fakeWorkerLogger) Debug(string, ...interface{}) {}
func (f *fakeWorkerLogger) Warn(string, ...interface{})  {}

type fakeWorkerPubSub struct {
	published []*pubsub.Message
}

func (f *fakeWorkerPubSub) Publish(_ context.Context, message *pubsub.Message) error {
	f.published = append(f.published, &pubsub.Message{
		Topic: message.Topic,
		Data:  message.Data,
	})
	return nil
}

func (f *fakeWorkerPubSub) Subscribe(context.Context, []string, func([]byte) (interface{}, error)) (pubsub.Subscriber, error) {
	return nil, errors.New("not implemented in unit test")
}

type fakeWorkerOutboxRepo struct {
	pendingEvents   []models.OutboxEvent
	pendingErr      error
	bookingEvent    *models.OutboxEvent
	bookingEventErr error
	markSentCalls   []int
	markFailedCalls []int
}

func (f *fakeWorkerOutboxRepo) GetPendingEvents(context.Context, int) ([]models.OutboxEvent, error) {
	if f.pendingErr != nil {
		return nil, f.pendingErr
	}
	return f.pendingEvents, nil
}

func (f *fakeWorkerOutboxRepo) GetBookingEventByBookingID(context.Context, string) (*models.OutboxEvent, error) {
	if f.bookingEventErr != nil {
		return nil, f.bookingEventErr
	}
	return f.bookingEvent, nil
}

func (f *fakeWorkerOutboxRepo) MarkEventAsSent(_ context.Context, eventID int) error {
	f.markSentCalls = append(f.markSentCalls, eventID)
	return nil
}

func (f *fakeWorkerOutboxRepo) MarkEventAsFailed(_ context.Context, eventID int) error {
	f.markFailedCalls = append(f.markFailedCalls, eventID)
	return nil
}

type fakeBookingServiceServer struct {
	pb.UnimplementedBookingServiceServer
	updateResp     *pb.UpdateBookingStatusResponse
	updateErr      error
	updateRequests []*pb.UpdateBookingStatusRequest
	createResp     *pb.CreateTicketsResponse
	createErr      error
	createRequests []*pb.CreateTicketsRequest
}

func (f *fakeBookingServiceServer) UpdateBookingStatus(_ context.Context, req *pb.UpdateBookingStatusRequest) (*pb.UpdateBookingStatusResponse, error) {
	f.updateRequests = append(f.updateRequests, &pb.UpdateBookingStatusRequest{
		BookingId: req.GetBookingId(),
		Status:    req.GetStatus(),
	})
	if f.updateErr != nil {
		return nil, f.updateErr
	}
	if f.updateResp == nil {
		return &pb.UpdateBookingStatusResponse{Success: true, UserId: "user-1", BookingId: req.GetBookingId()}, nil
	}
	return f.updateResp, nil
}

func (f *fakeBookingServiceServer) CreateTickets(_ context.Context, req *pb.CreateTicketsRequest) (*pb.CreateTicketsResponse, error) {
	f.createRequests = append(f.createRequests, &pb.CreateTicketsRequest{
		BookingId: req.GetBookingId(),
		SeatIds:   append([]string(nil), req.GetSeatIds()...),
	})
	if f.createErr != nil {
		return nil, f.createErr
	}
	if f.createResp == nil {
		return &pb.CreateTicketsResponse{Success: true}, nil
	}
	return f.createResp, nil
}

type fakeUserServiceServer struct {
	pb.UnimplementedUserServiceServer
	response *pb.GetUserByIdResponse
	err      error
	requests []*pb.GetUserByIdRequest
}

func (f *fakeUserServiceServer) GetUserById(_ context.Context, req *pb.GetUserByIdRequest) (*pb.GetUserByIdResponse, error) {
	f.requests = append(f.requests, &pb.GetUserByIdRequest{Id: req.GetId()})
	if f.err != nil {
		return nil, f.err
	}
	if f.response == nil {
		return &pb.GetUserByIdResponse{Found: true, User: &pb.User{Id: req.GetId(), Email: "user@example.com"}}, nil
	}
	return f.response, nil
}

type fakeMovieServiceServer struct {
	pb.UnimplementedMovieServiceServer
	showtimeResp *pb.GetShowtimeResponse
	showtimeErr  error
	requests     []*pb.GetShowtimeRequest
}

func (f *fakeMovieServiceServer) GetShowtime(_ context.Context, req *pb.GetShowtimeRequest) (*pb.GetShowtimeResponse, error) {
	f.requests = append(f.requests, &pb.GetShowtimeRequest{Id: req.GetId()})
	if f.showtimeErr != nil {
		return nil, f.showtimeErr
	}
	if f.showtimeResp == nil {
		return &pb.GetShowtimeResponse{Success: true, Data: &pb.ShowtimeData{}}, nil
	}
	return f.showtimeResp, nil
}

type unsupportedWorkerMovieService struct {
	pb.UnimplementedMovieServiceServer
}

func newTestWorkerRedis(t *testing.T) (*miniredis.Miniredis, *redis.Client) {
	t.Helper()

	server := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: server.Addr()})

	t.Cleanup(func() {
		_ = client.Close()
	})

	return server, client
}

func newTestBookingClient(t *testing.T, server pb.BookingServiceServer) *workergrpc.BookingClient {
	t.Helper()

	listener := bufconn.Listen(1024 * 1024)
	grpcServer := gogrpc.NewServer()
	pb.RegisterBookingServiceServer(grpcServer, server)

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
		t.Fatalf("failed to create booking bufconn client: %v", err)
	}
	t.Cleanup(func() { _ = conn.Close() })

	client := &workergrpc.BookingClient{}
	setUnexportedField(client, "conn", conn)
	setUnexportedField(client, "client", pb.NewBookingServiceClient(conn))
	return client
}

func newTestUserClient(t *testing.T, server pb.UserServiceServer) *workergrpc.UserClient {
	t.Helper()

	listener := bufconn.Listen(1024 * 1024)
	grpcServer := gogrpc.NewServer()
	pb.RegisterUserServiceServer(grpcServer, server)

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
		t.Fatalf("failed to create user bufconn client: %v", err)
	}
	t.Cleanup(func() { _ = conn.Close() })

	client := &workergrpc.UserClient{}
	setUnexportedField(client, "conn", conn)
	setUnexportedField(client, "client", pb.NewUserServiceClient(conn))
	return client
}

func newTestMovieClient(t *testing.T, server pb.MovieServiceServer) *workergrpc.MovieClient {
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
		t.Fatalf("failed to create movie bufconn client: %v", err)
	}
	t.Cleanup(func() { _ = conn.Close() })

	client := &workergrpc.MovieClient{}
	setUnexportedField(client, "conn", conn)
	setUnexportedField(client, "client", pb.NewMovieServiceClient(conn))
	return client
}

func setUnexportedField(target any, fieldName string, value any) {
	field := reflect.ValueOf(target).Elem().FieldByName(fieldName)
	reflect.NewAt(field.Type(), unsafe.Pointer(field.UnsafeAddr())).Elem().Set(reflect.ValueOf(value))
}

func newTestWorker(
	repo datastore.OutboxRepository,
	pubsubClient pubsub.PubSub,
	redisClient redis.UniversalClient,
	bookingClient *workergrpc.BookingClient,
	userClient *workergrpc.UserClient,
	movieClient *workergrpc.MovieClient,
) *Worker {
	return &Worker{
		logger:        &fakeWorkerLogger{},
		pubsub:        pubsubClient,
		redisClient:   redisClient,
		outboxRepo:    repo,
		bookingClient: bookingClient,
		userClient:    userClient,
		movieClient:   movieClient,
	}
}

func mustMarshalWorkerJSON(t *testing.T, value any) string {
	t.Helper()

	payload, err := json.Marshal(value)
	if err != nil {
		t.Fatalf("failed to marshal json payload: %v", err)
	}
	return string(payload)
}

func futureShowtimeResponse() *pb.GetShowtimeResponse {
	start := time.Now().Add(2 * time.Hour)
	return &pb.GetShowtimeResponse{
		Success: true,
		Data: &pb.ShowtimeData{
			Id:              "showtime-1",
			ShowtimeDate:    start.Format("2006-01-02"),
			ShowtimeTime:    start.Format("15:04:05"),
			DurationSeconds: int64((2 * time.Hour).Seconds()),
		},
	}
}

func TestWorker_ProcessEvent(t *testing.T) {
	ctx := context.Background()

	t.Run("caches seat locks for every seat when handling booking created", func(t *testing.T) {
		// Test Case ID: TC-GO-WORK-026
		redisServer, redisClient := newTestWorkerRedis(t)
		worker := newTestWorker(&fakeWorkerOutboxRepo{}, &fakeWorkerPubSub{}, redisClient, nil, nil, nil)

		event := models.OutboxEvent{
			EventType: models.EventTypeBookingCreated,
			Payload: mustMarshalWorkerJSON(t, &models.BookingEventData{
				BookingId:  "booking-1",
				ShowtimeId: "showtime-1",
				SeatIds:    []string{"A1", "A2"},
			}),
		}

		if err := worker.processEvent(ctx, event); err != nil {
			t.Fatalf("expected booking-created event to succeed, got %v", err)
		}

		if got, err := redisServer.Get("seat_lock:showtime-1:A1"); err != nil || got != "booking-1" {
			t.Fatalf("expected lock key A1 to contain booking-1, got %q", got)
		}
		if got, err := redisServer.Get("seat_lock:showtime-1:A2"); err != nil || got != "booking-1" {
			t.Fatalf("expected lock key A2 to contain booking-1, got %q", got)
		}
	})

	t.Run("returns a payload error when booking created payload cannot be unmarshaled", func(t *testing.T) {
		// Test Case ID: TC-GO-WORK-027
		_, redisClient := newTestWorkerRedis(t)
		worker := newTestWorker(&fakeWorkerOutboxRepo{}, &fakeWorkerPubSub{}, redisClient, nil, nil, nil)

		err := worker.handleBookingCreated(ctx, models.OutboxEvent{
			EventType: models.EventTypeBookingCreated,
			Payload:   "{invalid-json",
		})
		if err == nil {
			t.Fatal("expected invalid booking payload to fail")
		}
		if !strings.Contains(err.Error(), "failed to unmarshal payload") {
			t.Fatalf("expected payload unmarshal error, got %v", err)
		}
	})

	t.Run("ignores unsupported event types without touching collaborators", func(t *testing.T) {
		// Test Case ID: TC-GO-WORK-028
		_, redisClient := newTestWorkerRedis(t)
		pubsubClient := &fakeWorkerPubSub{}
		worker := newTestWorker(&fakeWorkerOutboxRepo{}, pubsubClient, redisClient, nil, nil, nil)

		if err := worker.processEvent(ctx, models.OutboxEvent{
			EventType: "UNKNOWN_EVENT",
			Payload:   "{}",
		}); err != nil {
			t.Fatalf("expected unknown event to be ignored, got %v", err)
		}
		if len(pubsubClient.published) != 0 {
			t.Fatalf("expected no pubsub messages for unknown event, got %d", len(pubsubClient.published))
		}
	})
}

func TestWorker_HandlePaymentCompleted(t *testing.T) {
	ctx := context.Background()

	t.Run("confirms booking extends seat locks and publishes email plus user notifications", func(t *testing.T) {
		// Test Case ID: TC-GO-WORK-029
		redisServer, redisClient := newTestWorkerRedis(t)
		if err := redisClient.Set(ctx, "seat_lock:showtime-1:A1", "booking-1", time.Minute).Err(); err != nil {
			t.Fatalf("failed to seed seat lock A1: %v", err)
		}
		if err := redisClient.Set(ctx, "seat_lock:showtime-1:A2", "booking-1", time.Minute).Err(); err != nil {
			t.Fatalf("failed to seed seat lock A2: %v", err)
		}

		repo := &fakeWorkerOutboxRepo{
			bookingEvent: &models.OutboxEvent{
				ID:        1,
				EventType: models.EventTypeBookingCreated,
				Payload: mustMarshalWorkerJSON(t, &models.BookingEventData{
					BookingId:  "booking-1",
					ShowtimeId: "showtime-1",
					SeatIds:    []string{"A1", "A2"},
				}),
			},
		}
		pubsubClient := &fakeWorkerPubSub{}
		bookingServer := &fakeBookingServiceServer{
			updateResp: &pb.UpdateBookingStatusResponse{
				Success:   true,
				UserId:    "user-1",
				BookingId: "booking-1",
			},
			createResp: &pb.CreateTicketsResponse{
				Success: true,
				BookingDetails: &pb.BookingDetails{
					BookingId: "booking-1",
					Seats: []*pb.SeatInfo{
						{SeatRow: "A", SeatNumber: 1, SeatType: "STANDARD"},
						{SeatRow: "A", SeatNumber: 2, SeatType: "STANDARD"},
					},
					Showtime: &pb.ShowtimeInfo{
						ShowtimeId: "showtime-1",
						StartTime:  "2026-04-17T20:00:00Z",
						MovieName:  "Dune: Part Two",
						RoomName:   "Room 1",
					},
				},
			},
		}
		userServer := &fakeUserServiceServer{
			response: &pb.GetUserByIdResponse{
				Found: true,
				User:  &pb.User{Id: "user-1", Email: "user@example.com"},
			},
		}
		movieServer := &fakeMovieServiceServer{showtimeResp: futureShowtimeResponse()}

		worker := newTestWorker(
			repo,
			pubsubClient,
			redisClient,
			newTestBookingClient(t, bookingServer),
			newTestUserClient(t, userServer),
			newTestMovieClient(t, movieServer),
		)

		event := models.OutboxEvent{
			EventType: models.EventTypePaymentCompleted,
			Payload: mustMarshalWorkerJSON(t, map[string]interface{}{
				"payment_id": "payment-1",
				"booking_id": "booking-1",
				"amount":     180000,
			}),
		}

		if err := worker.handlePaymentCompleted(ctx, event); err != nil {
			t.Fatalf("expected happy path to succeed, got %v", err)
		}

		if len(bookingServer.updateRequests) != 1 {
			t.Fatalf("expected one booking status update call, got %d", len(bookingServer.updateRequests))
		}
		if bookingServer.updateRequests[0].GetBookingId() != "booking-1" || bookingServer.updateRequests[0].GetStatus() != "CONFIRMED" {
			t.Fatalf("unexpected booking status request: %+v", bookingServer.updateRequests[0])
		}
		if len(bookingServer.createRequests) != 1 {
			t.Fatalf("expected one create tickets call, got %d", len(bookingServer.createRequests))
		}
		if len(pubsubClient.published) != 2 {
			t.Fatalf("expected two pubsub publishes, got %d", len(pubsubClient.published))
		}
		if pubsubClient.published[0].Topic != "booking_success" || pubsubClient.published[1].Topic != "booking_user-1" {
			t.Fatalf("unexpected publish topics: %+v", pubsubClient.published)
		}

		if !redisServer.Exists("seat_lock:showtime-1:A1") || !redisServer.Exists("seat_lock:showtime-1:A2") {
			t.Fatalf("expected seeded seat locks to remain after ttl extension")
		}
		if redisServer.TTL("seat_lock:showtime-1:A1") <= 0 || redisServer.TTL("seat_lock:showtime-1:A2") <= 0 {
			t.Fatalf("expected positive ttl after extending seat locks, got ttl A1=%v A2=%v", redisServer.TTL("seat_lock:showtime-1:A1"), redisServer.TTL("seat_lock:showtime-1:A2"))
		}
	})

	t.Run("returns a missing field error before calling collaborators", func(t *testing.T) {
		// Test Case ID: TC-GO-WORK-030
		_, redisClient := newTestWorkerRedis(t)
		repo := &fakeWorkerOutboxRepo{}
		bookingServer := &fakeBookingServiceServer{}
		worker := newTestWorker(repo, &fakeWorkerPubSub{}, redisClient, newTestBookingClient(t, bookingServer), nil, nil)

		err := worker.handlePaymentCompleted(ctx, models.OutboxEvent{
			EventType: models.EventTypePaymentCompleted,
			Payload:   mustMarshalWorkerJSON(t, map[string]interface{}{"booking_id": "booking-1", "amount": 180000}),
		})
		if err == nil {
			t.Fatal("expected missing payment_id to fail")
		}
		if !strings.Contains(err.Error(), "missing or invalid payment_id") {
			t.Fatalf("expected missing payment_id error, got %v", err)
		}
		if len(bookingServer.updateRequests) != 0 {
			t.Fatalf("expected no booking client call after missing field error, got %d", len(bookingServer.updateRequests))
		}
	})

	t.Run("returns the booking event repository error", func(t *testing.T) {
		// Test Case ID: TC-GO-WORK-031
		_, redisClient := newTestWorkerRedis(t)
		bookingServer := &fakeBookingServiceServer{}
		worker := newTestWorker(
			&fakeWorkerOutboxRepo{bookingEventErr: errors.New("repository unavailable")},
			&fakeWorkerPubSub{},
			redisClient,
			newTestBookingClient(t, bookingServer),
			nil,
			nil,
		)

		err := worker.handlePaymentCompleted(ctx, models.OutboxEvent{
			EventType: models.EventTypePaymentCompleted,
			Payload: mustMarshalWorkerJSON(t, map[string]interface{}{
				"payment_id": "payment-1",
				"booking_id": "booking-1",
				"amount":     180000,
			}),
		})
		if err == nil {
			t.Fatal("expected booking event lookup failure")
		}
		if !strings.Contains(err.Error(), "failed to get booking event") {
			t.Fatalf("expected booking event repository error, got %v", err)
		}
		if len(bookingServer.updateRequests) != 0 {
			t.Fatalf("expected no booking update call after repo error, got %d", len(bookingServer.updateRequests))
		}
	})

	t.Run("returns an error when booking event contains no seats", func(t *testing.T) {
		// Test Case ID: TC-GO-WORK-032
		_, redisClient := newTestWorkerRedis(t)
		bookingServer := &fakeBookingServiceServer{}
		worker := newTestWorker(
			&fakeWorkerOutboxRepo{
				bookingEvent: &models.OutboxEvent{
					EventType: models.EventTypeBookingCreated,
					Payload: mustMarshalWorkerJSON(t, &models.BookingEventData{
						BookingId:  "booking-1",
						ShowtimeId: "showtime-1",
						SeatIds:    []string{},
					}),
				},
			},
			&fakeWorkerPubSub{},
			redisClient,
			newTestBookingClient(t, bookingServer),
			nil,
			nil,
		)

		err := worker.handlePaymentCompleted(ctx, models.OutboxEvent{
			EventType: models.EventTypePaymentCompleted,
			Payload: mustMarshalWorkerJSON(t, map[string]interface{}{
				"payment_id": "payment-1",
				"booking_id": "booking-1",
				"amount":     180000,
			}),
		})
		if err == nil {
			t.Fatal("expected empty seat list to fail")
		}
		if !strings.Contains(err.Error(), "no seats found for booking") {
			t.Fatalf("expected no seats error, got %v", err)
		}
		if len(bookingServer.updateRequests) != 0 {
			t.Fatalf("expected no booking update call after seat validation failure, got %d", len(bookingServer.updateRequests))
		}
	})
}

func TestWorker_ExtendSeatLocksUntilMovieEnds(t *testing.T) {
	ctx := context.Background()

	t.Run("returns a movie service error when showtime lookup fails", func(t *testing.T) {
		// Test Case ID: TC-GO-WORK-033
		_, redisClient := newTestWorkerRedis(t)
		worker := newTestWorker(
			&fakeWorkerOutboxRepo{},
			&fakeWorkerPubSub{},
			redisClient,
			nil,
			nil,
			newTestMovieClient(t, &fakeMovieServiceServer{showtimeErr: errors.New("movie service unavailable")}),
		)

		err := worker.extendSeatLocksUntilMovieEnds(ctx, &models.BookingEventData{
			ShowtimeId: "showtime-1",
			SeatIds:    []string{"A1"},
		})
		if err == nil {
			t.Fatal("expected showtime lookup failure")
		}
		if !strings.Contains(err.Error(), "failed to get showtime data") {
			t.Fatalf("expected showtime data error, got %v", err)
		}
	})

	t.Run("returns an expire error when redis cannot extend the seat lock", func(t *testing.T) {
		// Test Case ID: TC-GO-WORK-034
		badRedisClient := redis.NewClient(&redis.Options{
			Addr:         "127.0.0.1:1",
			DialTimeout:  50 * time.Millisecond,
			ReadTimeout:  50 * time.Millisecond,
			WriteTimeout: 50 * time.Millisecond,
		})
		t.Cleanup(func() {
			_ = badRedisClient.Close()
		})

		worker := newTestWorker(
			&fakeWorkerOutboxRepo{},
			&fakeWorkerPubSub{},
			badRedisClient,
			nil,
			nil,
			newTestMovieClient(t, &fakeMovieServiceServer{showtimeResp: futureShowtimeResponse()}),
		)

		err := worker.extendSeatLocksUntilMovieEnds(ctx, &models.BookingEventData{
			ShowtimeId: "showtime-1",
			SeatIds:    []string{"A1"},
		})
		if err == nil {
			t.Fatal("expected redis expire failure")
		}
		if !strings.Contains(err.Error(), "failed to extend lock for seat A1") {
			t.Fatalf("expected seat expire error, got %v", err)
		}
	})
}

var (
	_ logger.Logger              = (*fakeWorkerLogger)(nil)
	_ pubsub.PubSub              = (*fakeWorkerPubSub)(nil)
	_ datastore.OutboxRepository = (*fakeWorkerOutboxRepo)(nil)
)
