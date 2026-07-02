package grpc

import (
	"context"
	"fmt"
	"os"

	"worker-service/proto/pb"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type MovieClient struct {
	conn   *grpc.ClientConn
	client pb.MovieServiceClient
}

func NewMovieClient() (*MovieClient, error) {
	movieServiceURL := os.Getenv("MOVIE_SERVICE_GRPC_URL")
	if movieServiceURL == "" {
		movieServiceURL = "movie-service:50053"
	}

	conn, err := grpc.NewClient(
		movieServiceURL,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
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
		return nil, fmt.Errorf("failed to get showtime via gRPC: %w", err)
	}

	if !resp.Success {
		return nil, fmt.Errorf("get showtime failed: %s", resp.Message)
	}

	return resp.Data, nil
}

func (c *MovieClient) Close() error {
	if c.conn != nil {
		return c.conn.Close()
	}
	return nil
}
