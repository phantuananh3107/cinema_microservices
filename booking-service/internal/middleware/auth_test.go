package middleware

import (
	"testing"

	"github.com/golang-jwt/jwt/v5"
)

func TestExtractTokenFromHeaderString(t *testing.T) {
	// Test Case ID: TC-BOOK-MW-001
	token, err := extractTokenFromHeaderString("Bearer abc.def.ghi")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if token != "abc.def.ghi" {
		t.Fatalf("unexpected token: %s", token)
	}

	// Test Case ID: TC-BOOK-MW-002
	if _, err := extractTokenFromHeaderString("Basic token"); err == nil {
		t.Fatal("expected invalid scheme to fail")
	}
	if _, err := extractTokenFromHeaderString("Bearer null"); err == nil {
		t.Fatal("expected null token to fail")
	}
}

func TestParseJWTClaims(t *testing.T) {
	claims := jwt.MapClaims{
		"userId": "user-123",
		"exp":    float64(1893456000),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte("test-secret"))
	if err != nil {
		t.Fatalf("failed to generate signed token: %v", err)
	}

	// Test Case ID: TC-BOOK-MW-003
	parsedClaims, err := parseJWTClaims(tokenString)
	if err != nil {
		t.Fatalf("expected parse success, got %v", err)
	}
	if parsedClaims["userId"] != "user-123" {
		t.Fatalf("expected userId user-123, got %v", parsedClaims["userId"])
	}

	// Test Case ID: TC-BOOK-MW-004
	if _, err := parseJWTClaims("invalid-token"); err == nil {
		t.Fatal("expected invalid token parse to fail")
	}
}
