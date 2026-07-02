package main

import (
	"fmt"
	"os"

	"movie-service/internal/utils/env"

	"github.com/urfave/cli/v2"
)

func init() {
	env.LoadOnce()
}

func main() {
	app := &cli.App{
		Name:  "Cinema App",
		Usage: "App tool",
		Action: func(*cli.Context) error {
			fmt.Println("use --help")
			return nil
		},
		Commands: []*cli.Command{
			ServeAPI(),
			ServeGRPC(),
		},
	}

	if err := app.Run(os.Args); err != nil {
		fmt.Println("[Main] Run CLI error:", err.Error())
		return
	}
}
