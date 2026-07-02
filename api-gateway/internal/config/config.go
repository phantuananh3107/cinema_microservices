package config

import (
	"fmt"
	"os"
	"strings"

	"github.com/spf13/viper"
)

type Config struct {
	Server    ServerConfig    `mapstructure:"server"`
	Services  ServicesConfig  `mapstructure:"services"`
	Redis     RedisConfig     `mapstructure:"redis"`
	Auth      AuthConfig      `mapstructure:"auth"`
	RateLimit RateLimitConfig `mapstructure:"rate_limit"`
	Logging   LoggingConfig   `mapstructure:"logging"`
}

type ServerConfig struct {
	Port         string `mapstructure:"port"`
	Host         string `mapstructure:"host"`
	ReadTimeout  int    `mapstructure:"read_timeout"`
	WriteTimeout int    `mapstructure:"write_timeout"`
	IdleTimeout  int    `mapstructure:"idle_timeout"`
}

type ServicesConfig struct {
	AuthService         ServiceEndpoint `mapstructure:"auth_service"`
	MovieService        ServiceEndpoint `mapstructure:"movie_service"`
	NotificationService ServiceEndpoint `mapstructure:"notification_service"`
	UserService         ServiceEndpoint `mapstructure:"user_service"`
	BookingService      ServiceEndpoint `mapstructure:"booking_service"`
	PaymentService      ServiceEndpoint `mapstructure:"payment_service"`
	AnalyticsService    ServiceEndpoint `mapstructure:"analytics_service"`
	Chatbot             ServiceEndpoint `mapstructure:"chatbot"`
}

type ServiceEndpoint struct {
	URL             string   `mapstructure:"url"`
	HealthCheckPath string   `mapstructure:"health_check_path"`
	Timeout         int      `mapstructure:"timeout"`
	Retries         int      `mapstructure:"retries"`
	LoadBalancer    []string `mapstructure:"load_balancer"`
}

type RedisConfig struct {
	Address  string `mapstructure:"address"`
	Password string `mapstructure:"password"`
	DB       int    `mapstructure:"db"`
}

type AuthConfig struct {
	JWTSecret       string   `mapstructure:"jwt_secret"`
	PublicPaths     []string `mapstructure:"public_paths"`
	AdminPaths      []string `mapstructure:"admin_paths"`
	TokenExpiration int      `mapstructure:"token_expiration"`
}

type RateLimitConfig struct {
	RequestsPerSecond int `mapstructure:"requests_per_second"`
	BurstSize         int `mapstructure:"burst_size"`
	WindowSize        int `mapstructure:"window_size"`
}

type LoggingConfig struct {
	Level  string `mapstructure:"level"`
	Format string `mapstructure:"format"`
	Output string `mapstructure:"output"`
}

func isDockerEnvironment() bool {
	if _, err := os.Stat("/.dockerenv"); err == nil {
		return true
	}

	if os.Getenv("CONTAINER") == "true" || os.Getenv("DOCKER") == "true" {
		return true
	}

	if os.Getenv("KUBERNETES_SERVICE_HOST") != "" {
		return true
	}

	return false
}

func LoadConfig(path string) (*Config, error) {
	// Detect environment: Docker vs Local
	configName := "config"
	if isDockerEnvironment() {
		configName = "config.deploy"
	}

	viper.SetConfigName(configName)
	viper.SetConfigType("yaml")
	viper.AddConfigPath(path)
	viper.AddConfigPath(".")

	// Set defaults
	setDefaults()

	// Enable reading from environment variables
	viper.AutomaticEnv()
	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

	if err := viper.ReadInConfig(); err != nil {
		return nil, fmt.Errorf("error reading config file: %w", err)
	}

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		return nil, fmt.Errorf("error unmarshaling config: %w", err)
	}

	return &config, nil
}

func setDefaults() {
	// A defaults
	viper.SetDefault("server.port", "8000")
	viper.SetDefault("server.host", "0.0.0.0")
	viper.SetDefault("server.read_timeout", 30)
	viper.SetDefault("server.write_timeout", 30)
	viper.SetDefault("server.idle_timeout", 120)

	// B defaults
	viper.SetDefault("services.auth_service.url", "http://localhost:3001")
	viper.SetDefault("services.auth_service.health_check_path", "/api/auth/health")
	viper.SetDefault("services.auth_service.timeout", 30)
	viper.SetDefault("services.auth_service.retries", 3)

	viper.SetDefault("services.movie_service.url", "http://localhost:8083")
	viper.SetDefault("services.movie_service.health_check_path", "/api/health")
	viper.SetDefault("services.movie_service.timeout", 30)
	viper.SetDefault("services.movie_service.retries", 3)

	viper.SetDefault("services.notification_service.url", "http://localhost:8081")
	viper.SetDefault("services.notification_service.health_check_path", "/api/v1")
	viper.SetDefault("services.notification_service.timeout", 30)
	viper.SetDefault("services.notification_service.retries", 3)

	viper.SetDefault("services.booking_service.url", "http://localhost:8082")
	viper.SetDefault("services.booking_service.health_check_path", "/api/health")
	viper.SetDefault("services.booking_service.timeout", 30)
	viper.SetDefault("services.booking_service.retries", 3)

	viper.SetDefault("services.payment_service.url", "http://localhost:8086")
	viper.SetDefault("services.payment_service.health_check_path", "/api/v1/health")
	viper.SetDefault("services.payment_service.timeout", 30)
	viper.SetDefault("services.payment_service.retries", 3)

	viper.SetDefault("services.analytics_service.url", "http://localhost:8087")
	viper.SetDefault("services.analytics_service.health_check_path", "/health")
	viper.SetDefault("services.analytics_service.timeout", 30)
	viper.SetDefault("services.analytics_service.retries", 3)

	viper.SetDefault("services.user_service.url", "http://localhost:8005")
	viper.SetDefault("services.user_service.health_check_path", "/api/v1/health")
	viper.SetDefault("services.user_service.timeout", 30)
	viper.SetDefault("services.user_service.retries", 3)

	viper.SetDefault("services.chatbot.url", "http://localhost:8089")
	viper.SetDefault("services.chatbot.health_check_path", "/health")
	viper.SetDefault("services.chatbot.timeout", 30)
	viper.SetDefault("services.chatbot.retries", 3)

	// C defaults
	viper.SetDefault("redis.address", "localhost:6379")
	viper.SetDefault("redis.password", "")
	viper.SetDefault("redis.db", 0)

	// Auth defaults
	viper.SetDefault("auth.jwt_secret", "your-secret-key")
	viper.SetDefault("auth.public_paths", []string{
		"/api/auth/login",
		"/api/auth/register",
		"/api/movies",
		"/health",
	})
	viper.SetDefault("auth.admin_paths", []string{
		"/api/admin/*",
		"/api/movies/create",
		"/api/movies/*/update",
		"/api/movies/*/delete",
	})
	viper.SetDefault("auth.token_expiration", 3600)

	// Rate limiting defaults
	viper.SetDefault("rate_limit.requests_per_second", 100)
	viper.SetDefault("rate_limit.burst_size", 200)
	viper.SetDefault("rate_limit.window_size", 60)

	// Logging defaults
	viper.SetDefault("logging.level", "info")
	viper.SetDefault("logging.format", "text")
	viper.SetDefault("logging.output", "stdout")
}
