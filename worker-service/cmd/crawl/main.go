package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"

	"worker-service/internal/container"
	"worker-service/internal/jobs/crawl"
)

func init() {
	godotenv.Load(".env")
}

func main() {
	ctn := container.New()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	crawlWorker, err := crawl.NewWorker(ctn)
	if err != nil {
		log.Fatal("Failed to create crawl worker:", err)
	}

	if err = crawlWorker.Start(ctx); err != nil {
		log.Fatal("Failed to start crawl worker:", err)
	}

	log.Println("Crawl worker started...")

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	log.Println("Shutting down crawl worker...")
	cancel()
	time.Sleep(2 * time.Second)
}
