package middleware

import (
	"context"
	"fmt"
	"strings"
	"time"

	"booking-service/internal/pkg/caching"
	"booking-service/internal/pkg/response"

	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v4"
)

type AuthService interface {
	Validate(ctx context.Context, jwtToken string) (int, string, []string, error)
}

type TokenCacheData struct {
	UserID      string   `json:"user_id"`
	Role        string   `json:"role"`
	Permissions []string `json:"permissions"`
	ExpiresAt   int64    `json:"expires_at"`
}

func RequireAuth(auth AuthService, cacheService caching.Cache) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			authorizerHeader := c.Request().Header.Get("Authorization")
			if authorizerHeader == "" {
				return response.Unauthorized(c, "Authorization header is required")
			}

			token, err := extractTokenFromHeaderString(authorizerHeader)
			if err != nil {
				return response.Unauthorized(c, "Invalid authorization header format")
			}

			cachedData := new(TokenCacheData)
			cacheKey := fmt.Sprintf("auth:token:%s", token)
			err = cacheService.Get(c.Request().Context(), cacheKey, cachedData)
			if err == nil {
				if time.Now().Unix() <= cachedData.ExpiresAt {
					c.Set("user_id", cachedData.UserID)
					c.Set("userRole", cachedData.Role)
					c.Set("userPermissions", cachedData.Permissions)
					return next(c)
				}
				cacheService.Delete(c.Request().Context(), cacheKey)
			}

			status, role, permissions, err := auth.Validate(c.Request().Context(), token)
			if err != nil {
				return response.Unauthorized(c, "Unauthorized: token validation failed")
			}

			if status != 200 {
				return response.Forbidden(c, "Forbidden: invalid user status")
			}

			claims, err := parseJWTClaims(token)
			if err != nil {
				return response.Unauthorized(c, "Failed to parse token claims")
			}

			userId := claims["userId"].(string)
			if userId == "" {
				return response.Unauthorized(c, "User ID not found in token")
			}

			exp, ok := claims["exp"].(float64)
			if !ok {
				exp = float64(time.Now().Add(time.Hour).Unix())
			}

			tokenData := TokenCacheData{
				UserID:      userId,
				Role:        role,
				Permissions: permissions,
				ExpiresAt:   int64(exp),
			}

			err = cacheService.Set(c.Request().Context(), cacheKey, tokenData, 10*time.Minute)
			if err != nil {
				return response.InternalServerError(c, "Failed to cache token data")
			}

			fmt.Println("tokenData", tokenData)

			c.Set("user_id", userId)
			c.Set("userRole", role)
			c.Set("userPermissions", permissions)

			return next(c)
		}
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

func parseJWTClaims(tokenString string) (jwt.MapClaims, error) {
	token, _, err := new(jwt.Parser).ParseUnverified(tokenString, jwt.MapClaims{})
	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, fmt.Errorf("invalid token claims")
	}

	return claims, nil
}
