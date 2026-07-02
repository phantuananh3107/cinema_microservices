package main

import (
	"errors"
	"net/http"
	"strings"
	"sync"

	"github.com/samber/do"

	"notification-service/internal/services"

	"notification-service/internal/container"
	"notification-service/internal/handlers"
	"notification-service/internal/utils/env"

	"github.com/sirupsen/logrus"
	"github.com/urfave/cli/v2"
)

func commandServe() *cli.Command {
	return &cli.Command{
		Name:  "serve",
		Usage: "Start the notification service",
		Flags: []cli.Flag{
			&cli.StringFlag{
				Name:  "addr",
				Value: "0.0.0.0:8080",
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

	wg.Add(1)
	go func() {
		defer wg.Done()
		logrus.Printf("ListenAndServe: %s (%s)\n", c.String("addr"), vs["API_MODE"])
		if err = server.ListenAndServe(); err != nil && !errors.Is(http.ErrServerClosed, err) {
			logrus.Fatalf("ListenAndServe: %v\n", err)
		}
	}()

	emailService, err := do.Invoke[*services.EmailService](i)
	if err != nil {
		return err
	}

	wg.Add(1)
	go func() {
		defer wg.Done()
		logrus.Printf("Email verification service started\n")
		if err = emailService.SubscribeEmailNotificationQueue(c.Context); err != nil {
			logrus.Fatalf("Email verification service error: %v\n", err)
		}
	}()

	wg.Wait()

	return nil
}
