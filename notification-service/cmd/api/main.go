package main

import (
	"os"

	"github.com/joho/godotenv"
	"github.com/sirupsen/logrus"
	"github.com/urfave/cli/v2"
)

func init() {
	// for development
	//nolint:errcheck
	godotenv.Load("../../.env")

	// for production
	//nolint:errcheck
	godotenv.Load("./.env")
}

var (
	AppName    = "notification-service"
	AppVersion = "0.0.1+dev"
	AppCommit  = "unknown"
)

func main() {
	app := &cli.App{
		Name: "notification-service",
		Commands: []*cli.Command{
			commandServe(),
		},
	}

	if err := app.Run(os.Args); err != nil {
		logrus.Fatal(err)
	}
}
