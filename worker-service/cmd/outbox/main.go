package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"os"
	"os/signal"
	"syscall"
	"time"

	"worker-service/internal/container"
	grpcServer "worker-service/internal/grpc"
	"worker-service/internal/jobs/outbox"
	"worker-service/proto/pb"

	"github.com/samber/do"
	"github.com/uptrace/bun"
	"google.golang.org/grpc"
)

func main() {
	ctn := container.New()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	db, err := do.Invoke[*bun.DB](ctn)
	if err != nil {
		panic(err)
	}

	grpcPort := os.Getenv("GRPC_PORT")
	if grpcPort == "" {
		grpcPort = "50083"
	}

	lis, err := net.Listen("tcp", fmt.Sprintf(":%s", grpcPort))
	if err != nil {
		panic(err)
	}

	grpcSrv := grpc.NewServer()
	outboxServer := grpcServer.NewOutboxServer(db)
	pb.RegisterOutboxServiceServer(grpcSrv, outboxServer)

	go func() {
		log.Printf("Starting gRPC server on port %s...", grpcPort)
		if err = grpcSrv.Serve(lis); err != nil {
			panic(err)
		}
	}()

	outboxWorker, err := outbox.NewWorker(ctn)
	if err != nil {
		panic(err)
	}

	go func() {
		if err = outboxWorker.Start(ctx); err != nil {
			log.Printf("Outbox worker error: %v", err)
		}
	}()

	log.Println("Outbox worker and gRPC server started...")

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	grpcSrv.GracefulStop()
	cancel()
	time.Sleep(2 * time.Second)
}
