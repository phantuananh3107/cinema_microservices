package grpc

import (
	"context"
	"fmt"
	"os"

	"worker-service/proto/pb"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type BookingClient struct {
	conn   *grpc.ClientConn
	client pb.BookingServiceClient
}

func NewBookingClient() (*BookingClient, error) {
	bookingServiceURL := os.Getenv("BOOKING_SERVICE_GRPC_URL")
	if bookingServiceURL == "" {
		bookingServiceURL = "booking-service:50082"
	}

	conn, err := grpc.NewClient(
		bookingServiceURL,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to booking service: %w", err)
	}

	client := pb.NewBookingServiceClient(conn)

	return &BookingClient{
		conn:   conn,
		client: client,
	}, nil
}

func (c *BookingClient) UpdateBookingStatusWithResponse(ctx context.Context, bookingId string, status string) (*pb.UpdateBookingStatusResponse, error) {
	req := &pb.UpdateBookingStatusRequest{
		BookingId: bookingId,
		Status:    status,
	}

	resp, err := c.client.UpdateBookingStatus(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("failed to update booking status via gRPC: %w", err)
	}

	if !resp.Success {
		return nil, fmt.Errorf("update booking status failed: %s", resp.Message)
	}

	return resp, nil
}

func (c *BookingClient) CreateTicketsWithDetails(ctx context.Context, bookingId string, seatIds []string) (*pb.CreateTicketsResponse, error) {
	req := &pb.CreateTicketsRequest{
		BookingId: bookingId,
		SeatIds:   seatIds,
	}

	resp, err := c.client.CreateTickets(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("failed to create tickets via gRPC: %w", err)
	}

	if !resp.Success {
		return nil, fmt.Errorf("create tickets failed: %s", resp.Message)
	}

	return resp, nil
}
