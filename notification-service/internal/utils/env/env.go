package env

import (
	"fmt"
	"os"
)

func EnvsRequired(envs ...string) (map[string]string, error) {
	m := make(map[string]string)

	for _, env := range envs {
		v := os.Getenv(env)
		if v == "" {
			return nil, fmt.Errorf("env %s is required", env)
		}
		m[env] = v
	}

	return m, nil
}
