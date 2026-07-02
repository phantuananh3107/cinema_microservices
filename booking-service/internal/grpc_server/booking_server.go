package grpc_server

import (
	"context"
	"fmt"

	"booking-service/internal/datastore"
	"booking-service/internal/services"
	"booking-service/proto/pb"

	"github.com/samber/do"
	"github.com/sirupsen/logrus"
	"github.com/uptrace/bun"
)

type BookingServer struct {
	pb.UnimplementedBookingServiceServer
	bookingService *services.BookingService
	db             *bun.DB
}

func NewBookingServer(i *do.Injector) (*BookingServer, error) {
	bookingService, err := do.Invoke[*services.BookingService](i)
	if err != nil {
		return nil, err
	}

	db, err := do.Invoke[*bun.DB](i)
	if err != nil {
		return nil, err
	}

	return &BookingServer{
		bookingService: bookingService,
		db:             db,
	}, nil
}

func (s *BookingServer) UpdateBookingStatus(ctx context.Context, req *pb.UpdateBookingStatusRequest) (*pb.UpdateBookingStatusResponse, error) {
	userId, err := s.bookingService.UpdateBookingStatus(ctx, req.BookingId, req.Status)
	if err != nil {
		return &pb.UpdateBookingStatusResponse{
			Success:   false,
			Message:   fmt.Sprintf("failed to update booking status: %v", err),
			UserId:    "",
			BookingId: req.BookingId,
		}, err
	}

	return &pb.UpdateBookingStatusResponse{
		Success:   true,
		Message:   "Booking status updated successfully",
		UserId:    userId,
		BookingId: req.BookingId,
	}, nil
}

func (s *BookingServer) CreateTickets(ctx context.Context, req *pb.CreateTicketsRequest) (*pb.CreateTicketsResponse, error) {
	bookingDetails, ticketsCreated, err := s.bookingService.CreateTicketsWithDetails(ctx, req.BookingId, req.SeatIds)
	if err != nil {
		return &pb.CreateTicketsResponse{
			Success:        false,
			Message:        fmt.Sprintf("failed to create tickets: %v", err),
			TicketsCreated: 0,
			BookingDetails: nil,
		}, err
	}

	seats := make([]*pb.SeatInfo, 0, len(bookingDetails.Seats))
	for _, seat := range bookingDetails.Seats {
		seats = append(seats, &pb.SeatInfo{
			SeatRow:    seat.SeatRow,
			SeatNumber: int32(seat.SeatNumber),
			SeatType:   seat.SeatType,
		})
	}

	pbBookingDetails := &pb.BookingDetails{
		BookingId: bookingDetails.BookingId,
		Seats:     seats,
		Showtime: &pb.ShowtimeInfo{
			ShowtimeId: bookingDetails.Showtime.ShowtimeId,
			StartTime:  bookingDetails.Showtime.StartTime,
			MovieName:  bookingDetails.Showtime.MovieName,
			RoomName:   bookingDetails.Showtime.RoomName,
		},
	}

	logrus.Infof("[gRPC] Successfully created %d tickets for booking %s", ticketsCreated, req.BookingId)
	return &pb.CreateTicketsResponse{
		Success:        true,
		Message:        fmt.Sprintf("Created %d tickets successfully", ticketsCreated),
		TicketsCreated: int32(ticketsCreated),
		BookingDetails: pbBookingDetails,
	}, nil
}

func (s *BookingServer) GetRevenueByTime(ctx context.Context, req *pb.GetRevenueByTimeRequest) (*pb.GetRevenueByTimeResponse, error) {
	logrus.Infof("[gRPC] GetRevenueByTime called: start=%s, end=%s, limit=%d", req.StartDate, req.EndDate, req.Limit)

	limit := int(req.Limit)
	if limit <= 0 {
		limit = 100
	}

	results, err := datastore.GetRevenueByTime(ctx, s.db, req.StartDate, req.EndDate, limit)
	if err != nil {
		logrus.Errorf("[gRPC] Failed to get revenue by time: %v", err)
		return &pb.GetRevenueByTimeResponse{
			Success: false,
			Message: fmt.Sprintf("failed to get revenue by time: %v", err),
			Data:    nil,
		}, err
	}

	data := make([]*pb.RevenueByTime, 0, len(results))
	for _, r := range results {
		data = append(data, &pb.RevenueByTime{
			TimePeriod:      r.TimePeriod.Format("2006-01-02T15:04:05Z07:00"),
			TotalRevenue:    r.TotalRevenue,
			TotalBookings:   int32(r.TotalBookings),
			AvgBookingValue: r.AvgBookingValue,
		})
	}

	logrus.Infof("[gRPC] Successfully retrieved %d revenue records by time (grouped by day)", len(data))
	return &pb.GetRevenueByTimeResponse{
		Success: true,
		Message: "Revenue by time retrieved successfully",
		Data:    data,
	}, nil
}

func (s *BookingServer) GetRevenueByShowtime(ctx context.Context, req *pb.GetRevenueByShowtimeRequest) (*pb.GetRevenueByShowtimeResponse, error) {
	logrus.Infof("[gRPC] GetRevenueByShowtime called: start=%s, end=%s, showtime=%s, limit=%d",
		req.StartDate, req.EndDate, req.ShowtimeId, req.Limit)

	limit := int(req.Limit)
	if limit <= 0 {
		limit = 50
	}

	results, err := datastore.GetRevenueByShowtime(ctx, s.db, req.StartDate, req.EndDate, req.ShowtimeId, limit)
	if err != nil {
		logrus.Errorf("[gRPC] Failed to get revenue by showtime: %v", err)
		return &pb.GetRevenueByShowtimeResponse{
			Success: false,
			Message: fmt.Sprintf("failed to get revenue by showtime: %v", err),
			Data:    nil,
		}, err
	}

	data := make([]*pb.RevenueByShowtime, 0, len(results))
	for _, r := range results {
		data = append(data, &pb.RevenueByShowtime{
			ShowtimeId:    r.ShowtimeId,
			TotalRevenue:  r.TotalRevenue,
			TotalBookings: int32(r.TotalBookings),
			TotalTickets:  int32(r.TotalTickets),
		})
	}

	logrus.Infof("[gRPC] Successfully retrieved %d revenue records by showtime", len(data))
	return &pb.GetRevenueByShowtimeResponse{
		Success: true,
		Message: "Revenue by showtime retrieved successfully",
		Data:    data,
	}, nil
}

func (s *BookingServer) GetRevenueByBookingType(ctx context.Context, req *pb.GetRevenueByBookingTypeRequest) (*pb.GetRevenueByBookingTypeResponse, error) {
	logrus.Infof("[gRPC] GetRevenueByBookingType called: start=%s, end=%s", req.StartDate, req.EndDate)

	results, err := datastore.GetRevenueByBookingType(ctx, s.db, req.StartDate, req.EndDate)
	if err != nil {
		logrus.Errorf("[gRPC] Failed to get revenue by booking type: %v", err)
		return &pb.GetRevenueByBookingTypeResponse{
			Success: false,
			Message: fmt.Sprintf("failed to get revenue by booking type: %v", err),
			Data:    nil,
		}, err
	}

	data := make([]*pb.RevenueByBookingType, 0, len(results))
	for _, r := range results {
		data = append(data, &pb.RevenueByBookingType{
			BookingType:   r.BookingType,
			TotalRevenue:  r.TotalRevenue,
			TotalBookings: int32(r.TotalBookings),
			Percentage:    r.Percentage,
		})
	}

	logrus.Infof("[gRPC] Successfully retrieved %d revenue records by booking type", len(data))
	return &pb.GetRevenueByBookingTypeResponse{
		Success: true,
		Message: "Revenue by booking type retrieved successfully",
		Data:    data,
	}, nil
}

func (s *BookingServer) GetTotalRevenue(ctx context.Context, req *pb.GetTotalRevenueRequest) (*pb.GetTotalRevenueResponse, error) {
	logrus.Infof("[gRPC] GetTotalRevenue called: start=%s, end=%s", req.StartDate, req.EndDate)

	total, err := datastore.GetTotalRevenue(ctx, s.db, req.StartDate, req.EndDate)
	if err != nil {
		logrus.Errorf("[gRPC] Failed to get total revenue: %v", err)
		return &pb.GetTotalRevenueResponse{
			Success:      false,
			Message:      fmt.Sprintf("failed to get total revenue: %v", err),
			TotalRevenue: 0,
		}, err
	}

	logrus.Infof("[gRPC] Successfully retrieved total revenue: %.2f", total)
	return &pb.GetTotalRevenueResponse{
		Success:      true,
		Message:      "Total revenue retrieved successfully",
		TotalRevenue: total,
	}, nil
}
