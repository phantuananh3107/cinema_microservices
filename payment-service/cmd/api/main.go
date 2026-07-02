package main

import (
	"fmt"
	"os"

	"payment-service/internal/utils/env"

	"github.com/urfave/cli/v2"
)

func init() {
	env.LoadOnce()
}

func main() {
	app := &cli.App{
		Name:  "Payment Service",
		Usage: "App tool",
		Action: func(*cli.Context) error {
			fmt.Println("use --help")
			return nil
		},
		Commands: []*cli.Command{
			ServeAPI(),
		},
	}

	if err := app.Run(os.Args); err != nil {
		fmt.Println("[Main] Run CLI error:", err.Error())
		return
	}
}
