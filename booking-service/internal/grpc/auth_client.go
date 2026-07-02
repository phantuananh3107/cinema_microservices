package grpc

import (
	"context"
	"fmt"
	"os"

	"booking-service/proto/pb"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type AuthClient struct {
	client pb.AuthServiceClient
	conn   *grpc.ClientConn
}

func NewAuthClient() (*AuthClient, error) {
	authServiceUrl := os.Getenv("AUTH_SERVICE_GRPC_URL")
	if authServiceUrl == "" {
		authServiceUrl = "localhost:50052"
	}

	conn, err := grpc.NewClient(authServiceUrl, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, fmt.Errorf("failed to connect to movie service: %w", err)
	}

	client := pb.NewAuthServiceClient(conn)

	return &AuthClient{
		client: client,
		conn:   conn,
	}, nil
}

func (c *AuthClient) Validate(ctx context.Context, jwtToken string) (int, string, []string, error) {
	req := &pb.ValidateRequest{
		Token: jwtToken,
	}

	resp, err := c.client.Validate(ctx, req)
	if err != nil {
		return 0, "", nil, fmt.Errorf("failed to validate token: %w", err)
	}

	return int(resp.Status), resp.Role, resp.Permissions, nil
}
