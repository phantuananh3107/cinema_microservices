package middleware

import (
	"testing"

	"api-gateway/internal/config"
)

func TestIsPublicPath_MatchesLaterWildcardEntries(t *testing.T) {
	middleware := &AuthMiddleware{
		config: &config.Config{
			Auth: config.AuthConfig{
				PublicPaths: []string{
					"/api/v1/auth/login",
					"/api/v1/movies/*",
					"/api/v1/payments",
					"/api/v1/payments/*",
				},
			},
		},
	}

	if !middleware.isPublicPath("/api/v1/payments/webhooks/sepay") {
		t.Fatal("expected SePay webhook path to be public")
	}
}

func TestIsAdminPath_MatchesLaterWildcardEntries(t *testing.T) {
	middleware := &AuthMiddleware{
		config: &config.Config{
			Auth: config.AuthConfig{
				AdminPaths: []string{
					"/api/v1/movies/*/update",
					"/api/v1/admin/*",
				},
			},
		},
	}

	if !middleware.isAdminPath("/api/v1/admin/users") {
		t.Fatal("expected admin wildcard path to match")
	}
}
