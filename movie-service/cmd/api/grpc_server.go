package main

import (
	"fmt"
	"net"

	"movie-service/internal/container"
	"movie-service/internal/module/movie/transport/grpc"
	seatBiz "movie-service/internal/module/seat/business"
	showTimeBiz "movie-service/internal/module/showtime/business"

	pb "movie-service/proto/pb"

	"github.com/urfave/cli/v2"
	grpc_server "google.golang.org/grpc"
)

func ServeGRPC() *cli.Command {
	return &cli.Command{
		Name:  "grpc",
		Usage: "start the gRPC server",
		Action: func(c *cli.Context) error {
			i := container.NewContainer()

			showtimeBiz, err := showTimeBiz.NewBusiness(i)
			if err != nil {
				return fmt.Errorf("failed to create showtime business: %w", err)
			}

			seatBiz, err := seatBiz.NewBusiness(i)
			if err != nil {
				return fmt.Errorf("failed to create seat business: %w", err)
			}

			s := grpc_server.NewServer()

			grpcServer := grpc.NewMovieGRPCServer(showtimeBiz, seatBiz)
			pb.RegisterMovieServiceServer(s, grpcServer)

			lis, err := net.Listen("tcp", ":50053")
			if err != nil {
				return err
			}

			fmt.Println("movie service gRPC listening on port 50053")
			return s.Serve(lis)
		},
	}
}
