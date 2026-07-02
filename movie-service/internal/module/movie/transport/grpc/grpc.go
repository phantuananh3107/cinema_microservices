package grpc

import (
	"context"
	"fmt"

	seatEntity "movie-service/internal/module/seat/entity"
	"movie-service/internal/module/showtime/entity"
	"movie-service/proto/pb"

	"google.golang.org/grpc"
)

type ShowtimeBusiness interface {
	GetShowtimeById(ctx context.Context, id string) (*entity.Showtime, error)
	GetShowtimesByIds(ctx context.Context, ids []string) ([]*entity.Showtime, error)
}

type SeatBusiness interface {
	GetSeatById(ctx context.Context, id string) (*seatEntity.Seat, error)
	GetSeatsByIds(ctx context.Context, ids []string) ([]*seatEntity.Seat, error)
}

type MovieServiceServer struct {
	pb.UnimplementedMovieServiceServer
	showtimeBiz ShowtimeBusiness
	seatBiz     SeatBusiness
}

func NewMovieGRPCServer(showtimeBiz ShowtimeBusiness, seatBiz SeatBusiness) *MovieServiceServer {
	return &MovieServiceServer{
		showtimeBiz: showtimeBiz,
		seatBiz:     seatBiz,
	}
}

func (s *MovieServiceServer) GetShowtime(ctx context.Context, req *pb.GetShowtimeRequest) (*pb.GetShowtimeResponse, error) {
	showtime, err := s.showtimeBiz.GetShowtimeById(ctx, req.Id)
	if err != nil {
		return &pb.GetShowtimeResponse{
			Success: false,
			Message: fmt.Sprintf("Failed to get showtime: %v", err),
		}, nil
	}

	duration := int64(showtime.EndTime.Sub(showtime.StartTime).Seconds())

	showtimeData := &pb.ShowtimeData{
		Id:              showtime.Id,
		MovieId:         showtime.MovieId,
		RoomId:          showtime.RoomId,
		ShowtimeDate:    showtime.StartTime.Format("2006-01-02"),
		ShowtimeTime:    showtime.StartTime.Format("15:04:05"),
		MovieTitle:      showtime.Movie.Title,
		RoomNumber:      fmt.Sprintf("%d", showtime.Room.RoomNumber),
		SeatNumbers:     []string{},
		DurationSeconds: duration,
	}

	return &pb.GetShowtimeResponse{
		Success: true,
		Message: "Showtime retrieved successfully",
		Data:    showtimeData,
	}, nil
}

func (s *MovieServiceServer) GetShowtimes(ctx context.Context, req *pb.GetShowtimesRequest) (*pb.GetShowtimesResponse, error) {
	showtimes, err := s.showtimeBiz.GetShowtimesByIds(ctx, req.Ids)
	if err != nil {
		return &pb.GetShowtimesResponse{
			Success: false,
			Message: fmt.Sprintf("Failed to get showtimes: %v", err),
		}, nil
	}

	var showtimeData []*pb.ShowtimeData
	for _, showtime := range showtimes {
		duration := int64(showtime.EndTime.Sub(showtime.StartTime).Seconds())

		data := &pb.ShowtimeData{
			Id:              showtime.Id,
			MovieId:         showtime.MovieId,
			RoomId:          showtime.RoomId,
			ShowtimeDate:    showtime.StartTime.Format("2006-01-02"),
			ShowtimeTime:    showtime.StartTime.Format("15:04:05"),
			MovieTitle:      showtime.Movie.Title,
			RoomNumber:      fmt.Sprintf("%d", showtime.Room.RoomNumber),
			SeatNumbers:     []string{},
			DurationSeconds: duration,
		}
		showtimeData = append(showtimeData, data)
	}

	return &pb.GetShowtimesResponse{
		Success: true,
		Message: "Showtimes retrieved successfully",
		Data:    showtimeData,
	}, nil
}

func (s *MovieServiceServer) GetSeatsWithPrice(ctx context.Context, req *pb.GetSeatsWithPriceRequest) (*pb.GetSeatsWithPriceResponse, error) {
	if req.ShowtimeId == "" || len(req.SeatIds) == 0 {
		return &pb.GetSeatsWithPriceResponse{
			Success: false,
			Message: "showtime_id and seat_ids are required",
		}, nil
	}

	showtime, err := s.showtimeBiz.GetShowtimeById(ctx, req.ShowtimeId)
	if err != nil {
		return &pb.GetSeatsWithPriceResponse{
			Success: false,
			Message: fmt.Sprintf("Failed to get showtime: %v", err),
		}, nil
	}

	seats, err := s.seatBiz.GetSeatsByIds(ctx, req.SeatIds)
	if err != nil {
		return &pb.GetSeatsWithPriceResponse{
			Success: false,
			Message: fmt.Sprintf("Failed to get seats: %v", err),
		}, nil
	}

	if len(seats) != len(req.SeatIds) {
		return &pb.GetSeatsWithPriceResponse{
			Success: false,
			Message: "One or more seats not found",
		}, nil
	}

	var seatPriceData []*pb.SeatPriceData
	var totalAmount float64

	for _, seat := range seats {
		price := seat.CalculatePrice(showtime.BasePrice)
		totalAmount += price

		seatPriceData = append(seatPriceData, &pb.SeatPriceData{
			SeatId:     seat.Id,
			SeatNumber: seat.SeatNumber,
			SeatType:   string(seat.SeatType),
			Price:      price,
			Available:  seat.Status == seatEntity.SeatStatusAvailable,
		})
	}

	return &pb.GetSeatsWithPriceResponse{
		Success:     true,
		Message:     "Seats with prices retrieved successfully",
		Data:        seatPriceData,
		TotalAmount: totalAmount,
	}, nil
}

func (s *MovieServiceServer) GetSeatDetails(ctx context.Context, req *pb.GetSeatDetailsRequest) (*pb.GetSeatDetailsResponse, error) {
	if len(req.SeatIds) == 0 {
		return &pb.GetSeatDetailsResponse{
			Success: false,
			Message: "seat_ids are required",
		}, nil
	}

	seats, err := s.seatBiz.GetSeatsByIds(ctx, req.SeatIds)
	if err != nil {
		return &pb.GetSeatDetailsResponse{
			Success: false,
			Message: fmt.Sprintf("Failed to get seats: %v", err),
		}, nil
	}

	if len(seats) != len(req.SeatIds) {
		return &pb.GetSeatDetailsResponse{
			Success: false,
			Message: "One or more seats not found",
		}, nil
	}

	var seatDetails []*pb.SeatDetailData
	for _, seat := range seats {
		seatNumber := int32(0)
		fmt.Sscanf(seat.SeatNumber, "%d", &seatNumber)

		seatDetails = append(seatDetails, &pb.SeatDetailData{
			SeatId:     seat.Id,
			SeatRow:    seat.RowNumber,
			SeatNumber: seatNumber,
			SeatType:   string(seat.SeatType),
		})
	}

	return &pb.GetSeatDetailsResponse{
		Success: true,
		Message: "Seat details retrieved successfully",
		Data:    seatDetails,
	}, nil
}

func RegisterMovieServiceServer(s *grpc.Server, showtimeBiz ShowtimeBusiness, seatBiz SeatBusiness) {
	pb.RegisterMovieServiceServer(s, NewMovieGRPCServer(showtimeBiz, seatBiz))
}
