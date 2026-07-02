package env

import (
	"fmt"
	"os"
	"strings"
	"sync"

	"github.com/joho/godotenv"
)

const envPath = ".env,.env.local"

var once = new(sync.Once)

func LoadOnce(inits ...func()) {
	once.Do(func() {
		_ = godotenv.Overload(strings.Split(envPath, ",")...)
	})

	for _, init := range inits {
		init()
	}
}

func EnvsRequired(envs ...string) error {
	for _, env := range envs {
		if value := strings.TrimSpace(os.Getenv(env)); value == "" {
			return fmt.Errorf("Required environment variable not set: " + env)
		}
	}
	return nil
}
