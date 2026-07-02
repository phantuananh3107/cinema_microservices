package grpc

import (
	"context"
	"os"

	"github.com/samber/do"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"movie-service/proto/pb"
)

type AuthGrpcClient struct {
	client pb.AuthServiceClient
}

func NewAuthGrpcClient(_ *do.Injector) (*AuthGrpcClient, error) {
	authGrpcServer := os.Getenv("AUTH_RPC")
	if authGrpcServer == "" {
		authGrpcServer = "localhost:50051" // Default to localhost if not set
	}

	conn, err := grpc.NewClient(authGrpcServer, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, err
	}

	return &AuthGrpcClient{
		client: pb.NewAuthServiceClient(conn),
	}, nil
}

func (c *AuthGrpcClient) Validate(ctx context.Context, jwtToken string) (int, string, []string, error) {
	validated, err := c.client.Validate(ctx, &pb.ValidateRequest{
		Token: jwtToken,
	})
	if err != nil {
		return 0, "", nil, err
	}

	return int(validated.Status), validated.Role, validated.Permissions, nil
}
