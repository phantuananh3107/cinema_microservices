package config

import (
	"testing"
)

// Config with value types (current implementation)
type ValueConfig struct {
	Server    ServerConfig    `mapstructure:"server"`
	Services  ServicesConfig  `mapstructure:"services"`
	Redis     RedisConfig     `mapstructure:"redis"`
	Auth      AuthConfig      `mapstructure:"auth"`
	RateLimit RateLimitConfig `mapstructure:"rate_limit"`
	Logging   LoggingConfig   `mapstructure:"logging"`
}

// Config with pointer types
type PointerConfig struct {
	Server    *ServerConfig    `mapstructure:"server"`
	Services  *ServicesConfig  `mapstructure:"services"`
	Redis     *RedisConfig     `mapstructure:"redis"`
	Auth      *AuthConfig      `mapstructure:"auth"`
	RateLimit *RateLimitConfig `mapstructure:"rate_limit"`
	Logging   *LoggingConfig   `mapstructure:"logging"`
}

// Helper function to create value config
func createValueConfig() ValueConfig {
	return ValueConfig{
		Server: ServerConfig{
			Port:         "8080",
			Host:         "localhost",
			ReadTimeout:  30,
			WriteTimeout: 30,
			IdleTimeout:  120,
		},
		Services: ServicesConfig{
			AuthService: ServiceEndpoint{
				URL:             "http://localhost:3001",
				HealthCheckPath: "/health",
				Timeout:         30,
				Retries:         3,
				LoadBalancer:    []string{"server1", "server2"},
			},
			MovieService: ServiceEndpoint{
				URL:             "http://localhost:8080",
				HealthCheckPath: "/health",
				Timeout:         30,
				Retries:         3,
				LoadBalancer:    []string{"server1", "server2"},
			},
			NotificationService: ServiceEndpoint{
				URL:             "http://localhost:9090",
				HealthCheckPath: "/health",
				Timeout:         30,
				Retries:         3,
				LoadBalancer:    []string{"server1", "server2"},
			},
		},
		Redis: RedisConfig{
			Address:  "localhost:6379",
			Password: "secret",
			DB:       0,
		},
		Auth: AuthConfig{
			JWTSecret:       "super-secret-key",
			PublicPaths:     []string{"/api/auth/login", "/api/auth/register"},
			AdminPaths:      []string{"/api/admin/*"},
			TokenExpiration: 3600,
		},
		RateLimit: RateLimitConfig{
			RequestsPerSecond: 100,
			BurstSize:         200,
			WindowSize:        60,
		},
		Logging: LoggingConfig{
			Level:  "info",
			Format: "json",
			Output: "stdout",
		},
	}
}

// Helper function to create pointer config
func createPointerConfig() PointerConfig {
	return PointerConfig{
		Server: &ServerConfig{
			Port:         "8080",
			Host:         "localhost",
			ReadTimeout:  30,
			WriteTimeout: 30,
			IdleTimeout:  120,
		},
		Services: &ServicesConfig{
			AuthService: ServiceEndpoint{
				URL:             "http://localhost:3001",
				HealthCheckPath: "/health",
				Timeout:         30,
				Retries:         3,
				LoadBalancer:    []string{"server1", "server2"},
			},
			MovieService: ServiceEndpoint{
				URL:             "http://localhost:8080",
				HealthCheckPath: "/health",
				Timeout:         30,
				Retries:         3,
				LoadBalancer:    []string{"server1", "server2"},
			},
			NotificationService: ServiceEndpoint{
				URL:             "http://localhost:9090",
				HealthCheckPath: "/health",
				Timeout:         30,
				Retries:         3,
				LoadBalancer:    []string{"server1", "server2"},
			},
		},
		Redis: &RedisConfig{
			Address:  "localhost:6379",
			Password: "secret",
			DB:       0,
		},
		Auth: &AuthConfig{
			JWTSecret:       "super-secret-key",
			PublicPaths:     []string{"/api/auth/login", "/api/auth/register"},
			AdminPaths:      []string{"/api/admin/*"},
			TokenExpiration: 3600,
		},
		RateLimit: &RateLimitConfig{
			RequestsPerSecond: 100,
			BurstSize:         200,
			WindowSize:        60,
		},
		Logging: &LoggingConfig{
			Level:  "info",
			Format: "json",
			Output: "stdout",
		},
	}
}

// Benchmark config creation
func BenchmarkValueConfigCreation(b *testing.B) {
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = createValueConfig()
	}
}

func BenchmarkPointerConfigCreation(b *testing.B) {
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = createPointerConfig()
	}
}

// Benchmark config copying
func BenchmarkValueConfigCopy(b *testing.B) {
	cfg := createValueConfig()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		copyConfig := cfg
		_ = copyConfig
	}
}

func BenchmarkPointerConfigCopy(b *testing.B) {
	cfg := createPointerConfig()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		copyConfig := cfg
		_ = copyConfig
	}
}

// Benchmark field access
func BenchmarkValueConfigAccess(b *testing.B) {
	cfg := createValueConfig()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = cfg.Server.Port
		_ = cfg.Redis.Address
		_ = cfg.Auth.JWTSecret
		_ = cfg.RateLimit.RequestsPerSecond
		_ = cfg.Services.AuthService.URL
		_ = cfg.Logging.Level
	}
}

func BenchmarkPointerConfigAccess(b *testing.B) {
	cfg := createPointerConfig()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = cfg.Server.Port
		_ = cfg.Redis.Address
		_ = cfg.Auth.JWTSecret
		_ = cfg.RateLimit.RequestsPerSecond
		_ = cfg.Services.AuthService.URL
		_ = cfg.Logging.Level
	}
}

// Benchmark function calls with config passing
func processValueConfig(cfg ValueConfig) string {
	return cfg.Server.Host + ":" + cfg.Server.Port +
		"|" + cfg.Redis.Address +
		"|" + cfg.Auth.JWTSecret
}

func processPointerConfig(cfg PointerConfig) string {
	return cfg.Server.Host + ":" + cfg.Server.Port +
		"|" + cfg.Redis.Address +
		"|" + cfg.Auth.JWTSecret
}

func BenchmarkValueConfigProcessing(b *testing.B) {
	cfg := createValueConfig()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = processValueConfig(cfg)
	}
}

func BenchmarkPointerConfigProcessing(b *testing.B) {
	cfg := createPointerConfig()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = processPointerConfig(cfg)
	}
}

// Benchmark memory allocation with multiple configs
func BenchmarkValueConfigMultiple(b *testing.B) {
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		configs := make([]ValueConfig, 100)
		for j := 0; j < 100; j++ {
			configs[j] = createValueConfig()
		}
		_ = configs
	}
}

func BenchmarkPointerConfigMultiple(b *testing.B) {
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		configs := make([]PointerConfig, 100)
		for j := 0; j < 100; j++ {
			configs[j] = createPointerConfig()
		}
		_ = configs
	}
}

// Memory usage tests
func BenchmarkValueConfigMemory(b *testing.B) {
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		cfg := createValueConfig()
		_ = cfg.Server.Port + cfg.Redis.Address
	}
}

func BenchmarkPointerConfigMemory(b *testing.B) {
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		cfg := createPointerConfig()
		_ = cfg.Server.Port + cfg.Redis.Address
	}
}
