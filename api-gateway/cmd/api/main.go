package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"api-gateway/internal/config"
	"api-gateway/internal/middleware"
	"api-gateway/internal/pkg/auth"
	"api-gateway/internal/pkg/logger"
	"api-gateway/internal/pkg/response"
	"api-gateway/internal/proxy"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/redis/go-redis/v9"
)

func main() {
	cfg, err := config.LoadConfig(".")
	if err != nil {
		panic(fmt.Sprintf("Failed to load config: %v", err))
	}

	log := logger.NewLogger(cfg.Logging.Level, cfg.Logging.Format)
	log.Info("Starting API Gateway", "version", "1.0.0")

	var redisClient *redis.Client
	if cfg.Redis.Address != "" {
		redisClient = redis.NewClient(&redis.Options{
			Addr:     cfg.Redis.Address,
			Password: cfg.Redis.Password,
			DB:       cfg.Redis.DB,
		})
	}

	jwtManager := auth.NewJWTManager(cfg.Auth.JWTSecret, cfg.Auth.TokenExpiration/3600)

	proxyHandler := proxy.NewProxy(cfg, log)

	authMiddleware := middleware.NewAuthMiddleware(jwtManager, cfg, log)
	rateLimiter := middleware.NewRateLimiter(cfg, redisClient, log)

	if cfg.Logging.Level != "debug" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()

	// Global middleware
	router.Use(gin.Recovery())
	router.Use(middleware.SecurityHeaders())
	router.Use(middleware.CORS(middleware.DefaultCORSConfig()))
	router.Use(rateLimiter.Limit())
	// router.Use(authMiddleware.Authenticate()) // Uncomment if authentication globally

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		healthStatus := proxyHandler.HealthCheck()
		allHealthy := true
		for _, healthy := range healthStatus {
			if !healthy {
				allHealthy = false
				break
			}
		}

		status := http.StatusOK
		if !allHealthy {
			status = http.StatusServiceUnavailable
		}

		response.Success(c, status)
	})

	// Metrics endpoint for Prometheus
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// Token refresh endpoint
	router.POST("/api/auth/refresh", authMiddleware.RefreshToken())

	// Gateway info endpoint
	router.GET("/api/gateway/info", func(c *gin.Context) {
		response.Success(c, map[string]interface{}{
			"name":     "Cinema API Gateway",
			"version":  "1.0.0",
			"services": []string{"auth-service", "movie-service", "notification-service", "booking-service", "analytics-service"},
		})
	})

	// Catch-all proxy handler - should be last
	router.NoRoute(proxyHandler.ProxyRequest)

	// Create HTTP server
	server := &http.Server{
		Addr:         fmt.Sprintf("%s:%s", cfg.Server.Host, cfg.Server.Port),
		Handler:      router,
		ReadTimeout:  time.Duration(cfg.Server.ReadTimeout) * time.Second,
		WriteTimeout: time.Duration(cfg.Server.WriteTimeout) * time.Second,
		IdleTimeout:  time.Duration(cfg.Server.IdleTimeout) * time.Second,
	}

	// Start server in goroutine
	go func() {
		log.Info("Starting server",
			"host", cfg.Server.Host,
			"port", cfg.Server.Port,
			"address", server.Addr)

		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatal("Failed to start server", "error", err)
		}
	}()

	// Wait for interrupt signal to gracefully shut down the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Info("Shutting down server...")

	// Graceful shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown", "error", err)
	}

	// Close Redis connection if exists
	if redisClient != nil {
		redisClient.Close()
	}

	log.Info("Server shut down successfully")
}
