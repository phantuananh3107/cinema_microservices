package grpc

import (
	"context"
	"fmt"
	"os"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	"worker-service/proto/pb"
)

type UserClient struct {
	conn   *grpc.ClientConn
	client pb.UserServiceClient
}

func NewUserClient() (*UserClient, error) {
	userServiceURL := os.Getenv("USER_SERVICE_GRPC_URL")
	if userServiceURL == "" {
		userServiceURL = "user-service:50051"
	}

	conn, err := grpc.NewClient(
		userServiceURL,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to user service: %w", err)
	}

	client := pb.NewUserServiceClient(conn)

	return &UserClient{
		conn:   conn,
		client: client,
	}, nil
}

func (c *UserClient) GetUserEmailById(ctx context.Context, userId string) (string, error) {
	req := &pb.GetUserByIdRequest{
		Id: userId,
	}

	resp, err := c.client.GetUserById(ctx, req)
	if err != nil {
		return "", fmt.Errorf("failed to get user by id via gRPC: %w", err)
	}

	if !resp.Found {
		return "", fmt.Errorf("get user failed via gRPC")
	}

	return resp.User.Email, nil
}
