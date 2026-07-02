package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type AuthService interface {
	Validate(ctx context.Context, jwtToken string) (int, string, []string, error)
}

func RequireAuth(auth AuthService) func(*gin.Context) {
	return func(c *gin.Context) {
		authorizerHeader := c.GetHeader("Authorization")
		if authorizerHeader == "" {
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		}

		token, err := extractTokenFromHeaderString(authorizerHeader)
		if err != nil {
			c.Abort()
			return
		}

		status, role, permissions, err := auth.Validate(c.Request.Context(), token)
		if err != nil {
			c.AbortWithStatusJSON(401, gin.H{"error": "Unauthorized: token validation failed"})
			return
		}

		if status != 200 {
			c.AbortWithStatusJSON(403, gin.H{"error": "Forbidden: invalid user status"})
			return
		}

		c.Set("userRole", role)
		c.Set("userPermissions", permissions)

		c.Next()
	}
}

func extractTokenFromHeaderString(s string) (string, error) {
	parts := strings.Split(s, " ")
	//"Authorization" : "Bearer {token}"

	if parts[0] != "Bearer" || len(parts) < 2 || strings.TrimSpace(parts[1]) == "" || strings.TrimSpace(parts[1]) == "null" {
		return "", fmt.Errorf("invalid token")
	}

	return parts[1], nil
}
