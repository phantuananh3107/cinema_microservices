package main

import (
	"errors"
	"net"
	"net/http"
	"strings"
	"sync"

	"booking-service/internal/container"
	grpcServer "booking-service/internal/grpc_server"
	"booking-service/internal/handlers"
	"booking-service/internal/utils/env"
	"booking-service/proto/pb"

	"github.com/samber/do"
	"github.com/sirupsen/logrus"
	"github.com/urfave/cli/v2"
	"google.golang.org/grpc"
)

func commandServe() *cli.Command {
	return &cli.Command{
		Name:  "serve",
		Usage: "Start the booking service",
		Flags: []cli.Flag{
			&cli.StringFlag{
				Name:  "addr",
				Value: "0.0.0.0:8082",
				Usage: "serve address",
			},
		},
		Action: serve,
	}
}

func serve(c *cli.Context) error {
	vs, err := env.EnvsRequired(
		"API_MODE",
		"API_ORIGINS",
	)
	if err != nil {
		return err
	}

	i := container.NewContainer()

	router, err := handlers.New(&handlers.Config{
		Container: i,
		Mode:      vs["API_MODE"],
		Origins:   strings.Split(vs["API_ORIGINS"], ","),
	})

	server := &http.Server{
		Addr:    c.String("addr"),
		Handler: router,
	}

	wg := new(sync.WaitGroup)

	// Start HTTP server
	wg.Add(1)
	go func() {
		defer wg.Done()
		logrus.Printf("HTTP Server listening on %s (%s)\n", c.String("addr"), vs["API_MODE"])
		if err = server.ListenAndServe(); err != nil && !errors.Is(http.ErrServerClosed, err) {
			logrus.Fatalf("HTTP Server error: %v\n", err)
		}
	}()

	// Start gRPC server
	wg.Add(1)
	go func() {
		defer wg.Done()

		grpcPort := "50082"
		lis, err := net.Listen("tcp", ":"+grpcPort)
		if err != nil {
			logrus.Fatalf("Failed to listen on gRPC port %s: %v", grpcPort, err)
		}

		grpcSrv := grpc.NewServer()

		bookingServer, err := do.Invoke[*grpcServer.BookingServer](i)
		if err != nil {
			logrus.Fatalf("Failed to create booking gRPC server: %v", err)
		}

		pb.RegisterBookingServiceServer(grpcSrv, bookingServer)

		logrus.Printf("gRPC Server listening on :%s\n", grpcPort)
		if err := grpcSrv.Serve(lis); err != nil {
			logrus.Fatalf("gRPC Server error: %v\n", err)
		}
	}()

	wg.Wait()
	return nil
}
