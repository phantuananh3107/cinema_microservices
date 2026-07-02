package grpc

import (
	"context"
	"encoding/json"
	"fmt"

	"worker-service/internal/models"
	"worker-service/proto/pb"

	"github.com/uptrace/bun"
)

type OutboxServer struct {
	pb.UnimplementedOutboxServiceServer
	db *bun.DB
}

func NewOutboxServer(db *bun.DB) *OutboxServer {
	return &OutboxServer{
		db: db,
	}
}

func (s *OutboxServer) CreateOutboxEvent(ctx context.Context, req *pb.CreateOutboxEventRequest) (*pb.CreateOutboxEventResponse, error) {
	if req.EventType == "" {
		return &pb.CreateOutboxEventResponse{
			Success: false,
			Message: "event_type is required",
		}, nil
	}

	if req.Payload == "" {
		return &pb.CreateOutboxEventResponse{
			Success: false,
			Message: "payload is required",
		}, nil
	}

	var payloadMap map[string]interface{}
	if err := json.Unmarshal([]byte(req.Payload), &payloadMap); err != nil {
		return &pb.CreateOutboxEventResponse{
			Success: false,
			Message: fmt.Sprintf("invalid payload JSON: %v", err),
		}, nil
	}

	event := &models.OutboxEvent{
		EventType: models.OutboxEventType(req.EventType),
		Payload:   req.Payload,
		Status:    models.OutboxStatusPending,
	}

	result, err := s.db.NewInsert().
		Model(event).
		Exec(ctx)
	if err != nil {
		return &pb.CreateOutboxEventResponse{
			Success: false,
			Message: fmt.Sprintf("failed to create outbox event: %v", err),
		}, fmt.Errorf("failed to create outbox event: %w", err)
	}

	lastInsertId, err := result.LastInsertId()
	if err != nil {
		return &pb.CreateOutboxEventResponse{
			Success: true,
			Message: "outbox event created successfully",
			EventId: 0,
		}, nil
	}

	return &pb.CreateOutboxEventResponse{
		Success: true,
		Message: "outbox event created successfully",
		EventId: int32(lastInsertId),
	}, nil
}
