package grpc

import (
	"context"
	"fmt"
	"os"

	"booking-service/proto/pb"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type MovieClient struct {
	conn   *grpc.ClientConn
	client pb.MovieServiceClient
}

func NewMovieClient() (*MovieClient, error) {
	movieServiceUrl := os.Getenv("MOVIE_SERVICE_GRPC_URL")
	if movieServiceUrl == "" {
		movieServiceUrl = "localhost:50053"
	}

	conn, err := grpc.NewClient(movieServiceUrl, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, fmt.Errorf("failed to connect to movie service: %w", err)
	}

	client := pb.NewMovieServiceClient(conn)

	return &MovieClient{
		conn:   conn,
		client: client,
	}, nil
}

func (c *MovieClient) GetShowtime(ctx context.Context, showtimeId string) (*pb.ShowtimeData, error) {
	req := &pb.GetShowtimeRequest{
		Id: showtimeId,
	}

	resp, err := c.client.GetShowtime(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("failed to get showtime: %w", err)
	}

	if !resp.Success {
		return nil, fmt.Errorf("movie service error: %s", resp.Message)
	}

	return resp.Data, nil
}

func (c *MovieClient) GetShowtimes(ctx context.Context, showtimeIds []string) ([]*pb.ShowtimeData, error) {
	req := &pb.GetShowtimesRequest{
		Ids: showtimeIds,
	}

	resp, err := c.client.GetShowtimes(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("failed to get showtimes: %w", err)
	}

	if !resp.Success {
		return nil, fmt.Errorf("movie service error: %s", resp.Message)
	}

	return resp.Data, nil
}

func (c *MovieClient) GetSeatsWithPrice(ctx context.Context, showtimeId string, seatIds []string) (*pb.GetSeatsWithPriceResponse, error) {
	req := &pb.GetSeatsWithPriceRequest{
		ShowtimeId: showtimeId,
		SeatIds:    seatIds,
	}

	resp, err := c.client.GetSeatsWithPrice(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("failed to get seats with price: %w", err)
	}

	if !resp.Success {
		return nil, fmt.Errorf("movie service error: %s", resp.Message)
	}

	return resp, nil
}

func (c *MovieClient) GetSeatDetails(ctx context.Context, seatIds []string) ([]*pb.SeatDetailData, error) {
	req := &pb.GetSeatDetailsRequest{
		SeatIds: seatIds,
	}

	resp, err := c.client.GetSeatDetails(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("failed to get seat details: %w", err)
	}

	if !resp.Success {
		return nil, fmt.Errorf("movie service error: %s", resp.Message)
	}

	return resp.Data, nil
}
