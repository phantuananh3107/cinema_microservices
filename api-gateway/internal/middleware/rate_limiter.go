package middleware

import (
	"errors"
	"fmt"
	"strconv"
	"time"

	"api-gateway/internal/config"
	"api-gateway/internal/pkg/limiter"
	"api-gateway/internal/pkg/logger"
	"api-gateway/internal/pkg/response"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

type RateLimiter struct {
	config  *config.Config
	limiter limiter.Limiter
	logger  logger.Logger
	limit   limiter.Limit
}

func NewRateLimiter(cfg *config.Config, redisClient *redis.Client, log logger.Logger) *RateLimiter {
	var rlimiter limiter.Limiter
	if redisClient != nil {
		if rl, err := limiter.NewRedisLimiter(redisClient); err == nil {
			rlimiter = rl
		}
	}

	limit := limiter.Limit{
		Rate:   cfg.RateLimit.RequestsPerSecond,
		Burst:  cfg.RateLimit.BurstSize,
		Period: time.Duration(cfg.RateLimit.WindowSize) * time.Second,
	}

	return &RateLimiter{
		config:  cfg,
		limiter: rlimiter,
		logger:  log,
		limit:   limit,
	}
}

func (rl *RateLimiter) Limit() gin.HandlerFunc {
	return func(c *gin.Context) {
		clientID := rl.getClientID(c)

		result, err := rl.limiter.Allow(c.Request.Context(), clientID, rl.limit)
		if err != nil {
			if errors.Is(err, limiter.ErrRateLimited) {
				rl.handleRateLimitExceeded(c, result.Remaining, time.Now().Add(result.RetryAfter))
				return
			}

			rl.logger.Error("Rate limiter error",
				"client_id", clientID,
				"path", c.Request.URL.Path,
				"method", c.Request.Method,
				"error", err)

			response.InternalServerError(c, "Rate limiter service unavailable")
			c.Abort()
			return
		}

		if result != nil {
			c.Header("X-RateLimit-Limit", strconv.Itoa(rl.limit.Rate))
			c.Header("X-RateLimit-Remaining", strconv.Itoa(result.Remaining))
			c.Header("X-RateLimit-Reset", strconv.FormatInt(time.Now().Add(result.ResetAfter).Unix(), 10))
		}

		c.Next()
	}
}

// getClientID determines the client ID based on user ID or IP address.
func (rl *RateLimiter) getClientID(c *gin.Context) string {
	if userID, exists := c.Get("user_id"); exists {
		return fmt.Sprintf("user:%s", userID)
	}

	return fmt.Sprintf("ip:%s", c.ClientIP())
}

func (rl *RateLimiter) handleRateLimitExceeded(c *gin.Context, remaining int, resetTime time.Time) {
	rl.logger.Warn("Rate limit exceeded",
		"client_id", rl.getClientID(c),
		"path", c.Request.URL.Path,
		"method", c.Request.Method,
		"remaining", remaining)

	c.Header("X-RateLimit-Limit", strconv.Itoa(rl.config.RateLimit.RequestsPerSecond))
	c.Header("X-RateLimit-Remaining", "0")
	c.Header("X-RateLimit-Reset", strconv.FormatInt(resetTime.Unix(), 10))

	retryAfter := int64(time.Until(resetTime).Seconds())
	response.TooManyRequests(c, "Too many requests. Please try again later.", retryAfter)
	c.Abort()
}
