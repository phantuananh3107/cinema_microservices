package middleware

import (
	"path/filepath"
	"strings"

	"api-gateway/internal/config"
	"api-gateway/internal/pkg/auth"
	"api-gateway/internal/pkg/logger"
	"api-gateway/internal/pkg/response"

	"github.com/gin-gonic/gin"
)

type AuthMiddleware struct {
	jwtManager *auth.JWTManager
	config     *config.Config
	logger     logger.Logger
}

func NewAuthMiddleware(jwtManager *auth.JWTManager, cfg *config.Config, log logger.Logger) *AuthMiddleware {
	return &AuthMiddleware{
		jwtManager: jwtManager,
		config:     cfg,
		logger:     log,
	}
}

func (a *AuthMiddleware) Authenticate() gin.HandlerFunc {
	return func(c *gin.Context) {
		path := c.Request.URL.Path
		method := c.Request.Method

		// Check if path is public
		if a.isPublicPath(path) {
			c.Next()
			return
		}

		// Extract token from header
		authHeader := c.GetHeader("Authorization")
		token, err := auth.ExtractTokenFromHeader(authHeader)
		if err != nil {
			a.logger.Warn("Authentication failed - missing or invalid token",
				"path", path,
				"method", method,
				"error", err)

			response.UnauthorizedWithCode(c, "Authentication required", "UNAUTHORIZED")
			c.Abort()
			return
		}

		// Validate token
		claims, err := a.jwtManager.ValidateToken(token)
		if err != nil {
			a.logger.Warn("Authentication failed - invalid token",
				"path", path,
				"method", method,
				"error", err)

			response.UnauthorizedWithCode(c, "Invalid or expired token", "TOKEN_INVALID")
			c.Abort()
			return
		}

		// Check admin paths
		if a.isAdminPath(path) && claims.Role != "admin" && claims.Role != "manager_staff" && claims.Role != "ticket_staff" {
			a.logger.Warn("Authorization failed - insufficient permissions",
				"path", path,
				"method", method,
				"user_id", claims.UserID,
				"role", claims.Role)

			response.ForbiddenWithCode(c, "Insufficient permissions", "FORBIDDEN")
			c.Abort()
			return
		}

		// Add user info to context
		c.Set("user_id", claims.UserID)
		c.Set("user_email", claims.Email)
		c.Set("user_role", claims.Role)
		c.Set("claims", claims)

		a.logger.Info("Request authenticated",
			"path", path,
			"method", method,
			"user_id", claims.UserID,
			"role", claims.Role)

		c.Next()
	}
}

func (a *AuthMiddleware) isPublicPath(path string) bool {
	for _, publicPath := range a.config.Auth.PublicPaths {
		// Handle wildcard patterns
		if strings.HasSuffix(publicPath, "*") {
			prefix := strings.TrimSuffix(publicPath, "*")
			if !strings.HasPrefix(path, prefix) {
				return false
			}
			return true
		}
		// Exact match or glob pattern match
		matched, _ := filepath.Match(publicPath, path)
		if matched || path == publicPath {
			return true
		}
	}
	return false
}

func (a *AuthMiddleware) isAdminPath(path string) bool {
	for _, adminPath := range a.config.Auth.AdminPaths {
		// Handle wildcard patterns
		if strings.HasSuffix(adminPath, "*") {
			prefix := strings.TrimSuffix(adminPath, "*")
			if !strings.HasPrefix(path, prefix) {
				return false
			}
			return true
		}
		// Exact match or glob pattern match
		matched, _ := filepath.Match(adminPath, path)
		if matched || path == adminPath {
			return true
		}
	}
	return false
}

// RefreshToken Optional: Middleware to refresh tokens
func (a *AuthMiddleware) RefreshToken() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		token, err := auth.ExtractTokenFromHeader(authHeader)
		if err != nil {
			response.BadRequest(c, "Invalid token format")
			return
		}

		newToken, err := a.jwtManager.RefreshToken(token)
		if err != nil {
			response.Unauthorized(c, "Cannot refresh token")
			return
		}

		response.Success(c, gin.H{
			"token": newToken,
		})
	}
}
