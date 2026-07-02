package grpc

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	"payment-service/proto/pb"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type OutboxClient struct {
	conn   *grpc.ClientConn
	client pb.OutboxServiceClient
}

func NewOutboxClient() (*OutboxClient, error) {
	workerServiceURL := os.Getenv("WORKER_SERVICE_GRPC_URL")
	if workerServiceURL == "" {
		workerServiceURL = "worker-service:50083"
	}

	conn, err := grpc.NewClient(
		workerServiceURL,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to worker service: %w", err)
	}

	client := pb.NewOutboxServiceClient(conn)

	return &OutboxClient{
		conn:   conn,
		client: client,
	}, nil
}

func (c *OutboxClient) CreateOutboxEvent(ctx context.Context, eventType string, eventData interface{}) error {
	payloadBytes, err := json.Marshal(eventData)
	if err != nil {
		return fmt.Errorf("failed to marshal event data: %w", err)
	}

	req := &pb.CreateOutboxEventRequest{
		EventType: eventType,
		Payload:   string(payloadBytes),
	}

	resp, err := c.client.CreateOutboxEvent(ctx, req)
	if err != nil {
		return fmt.Errorf("failed to create outbox event via gRPC: %w", err)
	}

	if !resp.Success {
		return fmt.Errorf("create outbox event failed: %s", resp.Message)
	}

	return nil
}

func (c *OutboxClient) Close() error {
	if c.conn != nil {
		return c.conn.Close()
	}
	return nil
}
