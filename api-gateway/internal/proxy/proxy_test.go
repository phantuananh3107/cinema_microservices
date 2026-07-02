package proxy

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"api-gateway/internal/config"
)

// fakeLogger là một mock object dùng để giả lập logger mà không ghi log thật ra màn hình/file
type fakeLogger struct{}

func (f *fakeLogger) Debug(string, ...interface{}) {}
func (f *fakeLogger) Info(string, ...interface{})  {}
func (f *fakeLogger) Warn(string, ...interface{})  {}
func (f *fakeLogger) Error(string, ...interface{}) {}
func (f *fakeLogger) Fatal(string, ...interface{}) {}

// createMockGinContext tạo một mock Gin context từ httptest.ResponseRecorder và http.Request
// Hữu ích cho việc test các handler mà không cần khởi chạy server thực sự
func createMockGinContext(method string, path string, body io.Reader) (*gin.Context, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()

	req := httptest.NewRequest(method, path, body)
	req.Header.Set("Content-Type", "application/json")

	ctx, _ := gin.CreateTestContext(w)
	ctx.Request = req

	return ctx, w
}

// buildTestProxy khởi tạo một instance Proxy với cấu hình giả lập để phục vụ kiểm thử
func buildTestProxy() *Proxy {
	cfg := &config.Config{
		Services: config.ServicesConfig{
			AuthService:         config.ServiceEndpoint{URL: "http://auth"},
			MovieService:        config.ServiceEndpoint{URL: "http://movie"},
			UserService:         config.ServiceEndpoint{URL: "http://user"},
			NotificationService: config.ServiceEndpoint{URL: "http://notification"},
			BookingService:      config.ServiceEndpoint{URL: "http://booking"},
			PaymentService:      config.ServiceEndpoint{URL: "http://payment"},
			AnalyticsService:    config.ServiceEndpoint{URL: "http://analytics"},
			Chatbot:             config.ServiceEndpoint{URL: "http://chatbot"},
		},
	}
	return NewProxy(cfg, &fakeLogger{})
}

/**
 * TestGetTargetService: Kiểm tra logic định tuyến dựa trên đường dẫn URL.
 * Đảm bảo request đến đúng microservice mục tiêu.
 */
func TestGetTargetService(t *testing.T) {
	p := buildTestProxy()

	// Test Case ID: TC-GW-ROUTE-001
	// Mục tiêu: Xác nhận đường dẫn auth được định tuyến chính xác sang auth-service
	t.Run("route auth path to auth-service", func(t *testing.T) {
		svc, targetPath := p.getTargetService("/api/v1/auth/login")
		if svc == nil || svc.Name != "auth-service" {
			t.Fatalf("expected auth-service, got %+v", svc)
		}
		if targetPath != "/api/v1/auth/login" {
			t.Fatalf("unexpected target path: %s", targetPath)
		}
	})

	// Test Case ID: TC-GW-ROUTE-002
	// Mục tiêu: Xác nhận request tạo booking được chuyển sang booking-service
	t.Run("route booking path to booking-service", func(t *testing.T) {
		svc, targetPath := p.getTargetService("/api/v1/bookings")
		if svc == nil || svc.Name != "booking-service" {
			t.Fatalf("expected booking-service, got %+v", svc)
		}
		if targetPath != "/api/v1/bookings" {
			t.Fatalf("unexpected target path: %s", targetPath)
		}
	})

	// Test Case ID: TC-GW-ROUTE-003
	// Mục tiêu: Xác nhận request thanh toán được chuyển sang payment-service
	t.Run("route payment path to payment-service", func(t *testing.T) {
		svc, targetPath := p.getTargetService("/api/v1/payments")
		if svc == nil || svc.Name != "payment-service" {
			t.Fatalf("expected payment-service, got %+v", svc)
		}
		if targetPath != "/api/v1/payments" {
			t.Fatalf("unexpected target path: %s", targetPath)
		}
	})

	// Test Case ID: TC-GW-ROUTE-004
	// Mục tiêu: Xác nhận các route phim được ánh xạ về movie-service
	t.Run("route movies path to movie-service", func(t *testing.T) {
		svc, targetPath := p.getTargetService("/api/v1/movies")
		if svc == nil || svc.Name != "movie-service" {
			t.Fatalf("expected movie-service, got %+v", svc)
		}
		if targetPath != "/api/v1/movies" {
			t.Fatalf("unexpected target path: %s", targetPath)
		}
	})

	// Test Case ID: TC-GW-ROUTE-005
	// Mục tiêu: Xác nhận route showtime chi tiết vẫn được giữ nguyên đuôi path khi proxy
	t.Run("route showtime with path parameters to movie-service", func(t *testing.T) {
		svc, targetPath := p.getTargetService("/api/v1/showtimes/abc-123")
		if svc == nil || svc.Name != "movie-service" {
			t.Fatalf("expected movie-service, got %+v", svc)
		}
		if targetPath != "/api/v1/showtimes/abc-123" {
			t.Fatalf("unexpected target path: %s", targetPath)
		}
	})

	// Test Case ID: TC-GW-ROUTE-006
	// Mục tiêu: Xác nhận route notifications được chuyển sang notification-service
	t.Run("route notifications path to notification-service", func(t *testing.T) {
		svc, targetPath := p.getTargetService("/api/v1/notifications/u1/unread-count")
		if svc == nil || svc.Name != "notification-service" {
			t.Fatalf("expected notification-service, got %+v", svc)
		}
		if targetPath != "/api/v1/notifications/u1/unread-count" {
			t.Fatalf("unexpected target path: %s", targetPath)
		}
	})

	// Test Case ID: TC-GW-ROUTE-007
	// Mục tiêu: Xác nhận route analytics được chuyển sang analytics-service
	t.Run("route analytics path to analytics-service", func(t *testing.T) {
		svc, targetPath := p.getTargetService("/api/v1/analytics/revenue/time")
		if svc == nil || svc.Name != "analytics-service" {
			t.Fatalf("expected analytics-service, got %+v", svc)
		}
		if targetPath != "/api/v1/analytics/revenue/time" {
			t.Fatalf("unexpected target path: %s", targetPath)
		}
	})

	// Test Case ID: TC-GW-ROUTE-008
	// Mục tiêu: Xác nhận route chatbot được chuyển sang chatbot service
	t.Run("route chatbot path to chatbot service", func(t *testing.T) {
		svc, targetPath := p.getTargetService("/api/v1/chatbot/ask")
		if svc == nil || svc.Name != "chatbot" {
			t.Fatalf("expected chatbot, got %+v", svc)
		}
		if targetPath != "/api/v1/chatbot/ask" {
			t.Fatalf("unexpected target path: %s", targetPath)
		}
	})

	// Test Case ID: TC-GW-ROUTE-009
	// Mục tiêu: Xác nhận route tickets dùng chung nhánh booking-service
	t.Run("route tickets path to booking-service", func(t *testing.T) {
		svc, targetPath := p.getTargetService("/api/v1/tickets/booking/1")
		if svc == nil || svc.Name != "booking-service" {
			t.Fatalf("expected booking-service, got %+v", svc)
		}
		if targetPath != "/api/v1/tickets/booking/1" {
			t.Fatalf("unexpected target path: %s", targetPath)
		}
	})

	// Test Case ID: TC-GW-ROUTE-010
	// Mục tiêu: Kiểm tra trường hợp đường dẫn không tồn tại trong hệ thống
	t.Run("route unknown path to nil", func(t *testing.T) {
		svc, targetPath := p.getTargetService("/api/v1/unknown")
		if svc != nil {
			t.Fatalf("expected nil service, got %+v", svc)
		}
		if targetPath != "" {
			t.Fatalf("expected empty target path, got %s", targetPath)
		}
	})
}

func TestShouldForwardHeader(t *testing.T) {
	p := buildTestProxy()

	// Test Case ID: TC-GW-HEAD-011
	// Mục tiêu: Kiểm tra Authorization được phép forward sang downstream service
	t.Run("forward Authorization header", func(t *testing.T) {
		if !p.shouldForwardHeader("Authorization") {
			t.Fatal("expected Authorization to be forwarded")
		}
	})

	// Test Case ID: TC-GW-HEAD-012
	// Mục tiêu: Kiểm tra Content-Type được giữ lại khi proxy request có body JSON
	t.Run("forward Content-Type header", func(t *testing.T) {
		if !p.shouldForwardHeader("Content-Type") {
			t.Fatal("expected Content-Type to be forwarded")
		}
	})

	// Test Case ID: TC-GW-HEAD-013
	// Mục tiêu: Kiểm tra X-Request-ID được forward để phục vụ trace log liên service
	t.Run("forward X-Request-ID header", func(t *testing.T) {
		if !p.shouldForwardHeader("X-Request-ID") {
			t.Fatal("expected X-Request-ID to be forwarded")
		}
	})

	// Test Case ID: TC-GW-HEAD-014
	// Mục tiêu: Kiểm tra Host không bị forward nhằm tránh sai lệch host header ở service đích
	t.Run("reject Host header", func(t *testing.T) {
		if p.shouldForwardHeader("Host") {
			t.Fatal("expected Host to be filtered")
		}
	})

	// Test Case ID: TC-GW-HEAD-015
	// Mục tiêu: Kiểm tra Content-Length không bị forward thủ công
	t.Run("reject Content-Length header", func(t *testing.T) {
		if p.shouldForwardHeader("Content-Length") {
			t.Fatal("expected Content-Length to be filtered")
		}
		if p.shouldForwardHeader("content-length") {
			t.Fatal("expected content-length (lowercase) to be filtered")
		}
	})

	// Test Case ID: TC-GW-HEAD-016
	// Mục tiêu: Kiểm tra Connection không được forward
	t.Run("reject Connection header", func(t *testing.T) {
		if p.shouldForwardHeader("Connection") {
			t.Fatal("expected Connection to be filtered")
		}
	})

	// Test Case ID: TC-GW-HEAD-017
	// Mục tiêu: Kiểm tra Transfer-Encoding không được forward
	t.Run("reject Transfer-Encoding header", func(t *testing.T) {
		if p.shouldForwardHeader("Transfer-Encoding") {
			t.Fatal("expected Transfer-Encoding to be filtered")
		}
	})

	// Test Case ID: TC-GW-HEAD-018
	// Mục tiêu: Kiểm tra Upgrade không được forward trong luồng HTTP thông thường
	t.Run("reject Upgrade header", func(t *testing.T) {
		if p.shouldForwardHeader("Upgrade") {
			t.Fatal("expected Upgrade to be filtered")
		}
	})

	// Test Case ID: TC-GW-PROXY-004 (deprecated in new cases, kept as sanity check)
	t.Run("reject hop-by-hop headers", func(t *testing.T) {
		hopByHopHeaders := []string{
			"proxy-connection",
			"proxy-authenticate",
			"proxy-authorization",
			"te",
			"trailers",
		}
		for _, header := range hopByHopHeaders {
			if p.shouldForwardHeader(header) {
				t.Fatalf("expected %s to be filtered", header)
			}
		}
	})

	// Test Case ID: TC-GW-PROXY-005 (deprecated in new cases, kept as sanity check)
	t.Run("allow business headers", func(t *testing.T) {
		businessHeaders := []string{
			"Authorization",
			"X-Request-Id",
			"X-Custom-Header",
			"Accept",
			"Accept-Encoding",
		}
		for _, header := range businessHeaders {
			if !p.shouldForwardHeader(header) {
				t.Fatalf("expected %s to be forwarded", header)
			}
		}
	})
}

func TestShouldForwardResponseHeader(t *testing.T) {
	p := buildTestProxy()

	// Test Case ID: TC-GW-RES-019
	// Mục tiêu: Kiểm tra Content-Type của response được phép trả ngược cho client
	t.Run("forward Content-Type response header", func(t *testing.T) {
		if !p.shouldForwardResponseHeader("Content-Type") {
			t.Fatal("expected Content-Type to be forwarded")
		}
	})

	// Test Case ID: TC-GW-RES-020
	// Mục tiêu: Kiểm tra Set-Cookie vẫn được forward ở chiều response
	t.Run("forward Set-Cookie response header", func(t *testing.T) {
		if !p.shouldForwardResponseHeader("Set-Cookie") {
			t.Fatal("expected Set-Cookie to be forwarded")
		}
	})

	// Test Case ID: TC-GW-RES-021
	// Mục tiêu: Kiểm tra Content-Length không được forward ở response
	t.Run("reject Content-Length response header", func(t *testing.T) {
		if p.shouldForwardResponseHeader("Content-Length") {
			t.Fatal("expected Content-Length to be filtered")
		}
	})

	// Test Case ID: TC-GW-PROXY-006 (deprecated in new cases, kept as sanity check)
	t.Run("reject response hop-by-hop headers", func(t *testing.T) {
		if p.shouldForwardResponseHeader("Transfer-Encoding") {
			t.Fatal("expected Transfer-Encoding to be filtered")
		}
		if p.shouldForwardResponseHeader("connection") {
			t.Fatal("expected connection to be filtered")
		}
	})

	// Test Case ID: TC-GW-PROXY-007 (deprecated in new cases, kept as sanity check)
	t.Run("additional response business headers", func(t *testing.T) {
		businessResponseHeaders := []string{
			"Content-Type",
			"Set-Cookie",
			"Cache-Control",
			"Expires",
			"X-Custom-Header",
		}
		for _, header := range businessResponseHeaders {
			if !p.shouldForwardResponseHeader(header) {
				t.Fatalf("expected %s to be forwarded in response", header)
			}
		}
	})
	// Verify filtered response headers
	t.Run("response header exclusion list", func(t *testing.T) {
		excludedHeaders := []string{
			"Transfer-Encoding",
			"Connection",
			"Content-Length",
			"Upgrade",
			"Proxy-Connection",
		}
		for _, header := range excludedHeaders {
			if p.shouldForwardResponseHeader(header) {
				t.Fatalf("expected %s to be excluded from response headers", header)
			}
		}
	})
}

/**
 * TestProxyRequest: Kiểm tra logic ProxyRequest() để đảm bảo request được forward
 * chính xác sang backend service với headers, body, và response được xử lý đúng.
 *
 * Test Cases:
 * - TC-GW-PROXY-001: Successful GET request forwarding to auth-service
 * - TC-GW-PROXY-002: Successful POST request with JSON body to booking-service
 * - TC-GW-PROXY-003: Request with query parameters forwarding
 * - TC-GW-PROXY-004: Request headers (Authorization, X-Request-ID) are copied
 * - TC-GW-PROXY-005: Service not found returns 404
 * - TC-GW-PROXY-006: Backend server error (500) is properly forwarded
 * - TC-GW-PROXY-007: Empty request body handling
 * - TC-GW-PROXY-008: PATCH request forwarding with JSON body
 * - TC-GW-PROXY-009: DELETE request forwarding with status code preservation
 * - TC-GW-PROXY-010: Response headers (Content-Type, Set-Cookie) are copied
 */
func TestProxyRequest(t *testing.T) {
	// Test Case ID: TC-GW-PROXY-001
	// Mục tiêu: Xác nhận GET request được forward sang auth-service
	t.Run("successful GET request forwarding", func(t *testing.T) {
		// Mock backend server
		mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method != "GET" || r.URL.Path != "/api/v1/auth/login" {
				t.Fatalf("unexpected request: %s %s", r.Method, r.URL.Path)
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			fmt.Fprint(w, `{"token":"test-token"}`)
		}))
		defer mockServer.Close()

		// Setup proxy with mocked service endpoint
		cfg := &config.Config{
			Services: config.ServicesConfig{
				AuthService: config.ServiceEndpoint{URL: mockServer.URL, Timeout: 5, Retries: 1},
			},
		}
		proxy := NewProxy(cfg, &fakeLogger{})

		// Create mock Gin context
		ctx, recorder := createMockGinContext("GET", "/api/v1/auth/login", nil)

		// Execute ProxyRequest
		proxy.ProxyRequest(ctx)

		// Verify response
		if recorder.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d", recorder.Code)
		}
		if recorder.Body.String() != `{"token":"test-token"}` {
			t.Fatalf("unexpected response body: %s", recorder.Body.String())
		}
	})
	// Test Case ID: TC-GW-PROXY-002
	// Mục tiêu: POST request với JSON body được forward chính xác
	t.Run("successful POST request with JSON body", func(t *testing.T) {
		mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method != "POST" || r.URL.Path != "/api/v1/bookings" {
				t.Fatalf("unexpected request: %s %s", r.Method, r.URL.Path)
			}

			// Verify request body
			var payload map[string]interface{}
			json.NewDecoder(r.Body).Decode(&payload)
			if payload["showtime_id"] != "123" {
				t.Fatalf("unexpected payload: %v", payload)
			}

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusCreated)
			fmt.Fprint(w, `{"booking_id":"B001","status":"confirmed"}`)
		}))
		defer mockServer.Close()

		cfg := &config.Config{
			Services: config.ServicesConfig{
				BookingService: config.ServiceEndpoint{URL: mockServer.URL, Timeout: 5, Retries: 1},
			},
		}
		proxy := NewProxy(cfg, &fakeLogger{})

		// Create POST request with JSON body
		payload := `{"showtime_id":"123","seats":["A1","A2"]}`
		ctx, recorder := createMockGinContext("POST", "/api/v1/bookings", bytes.NewReader([]byte(payload)))

		proxy.ProxyRequest(ctx)

		if recorder.Code != http.StatusCreated {
			t.Fatalf("expected status 201, got %d", recorder.Code)
		}
		if !bytes.Contains(recorder.Body.Bytes(), []byte("B001")) {
			t.Fatalf("unexpected response: %s", recorder.Body.String())
		}
	})

	// Test Case ID: TC-GW-PROXY-003
	// Mục tiêu: Query parameters được forwarded đúng
	t.Run("request with query parameters", func(t *testing.T) {
		mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Verify query params
			if r.URL.Query().Get("page") != "2" || r.URL.Query().Get("limit") != "10" {
				t.Fatalf("query params not forwarded: %v", r.URL.Query())
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			fmt.Fprint(w, `{"movies":[]}`)
		}))
		defer mockServer.Close()

		cfg := &config.Config{
			Services: config.ServicesConfig{
				MovieService: config.ServiceEndpoint{URL: mockServer.URL, Timeout: 5, Retries: 1},
			},
		}
		proxy := NewProxy(cfg, &fakeLogger{})

		ctx, recorder := createMockGinContext("GET", "/api/v1/movies?page=2&limit=10", nil)
		proxy.ProxyRequest(ctx)

		if recorder.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d", recorder.Code)
		}
	})

	// Test Case ID: TC-GW-PROXY-004
	// Mục tiêu: Request headers (Authorization, X-Request-ID) được copy chính xác
	t.Run("request headers are forwarded", func(t *testing.T) {
		mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Verify headers are forwarded
			authHeader := r.Header.Get("Authorization")
			requestID := r.Header.Get("X-Request-ID")

			if authHeader != "Bearer test-token" {
				t.Fatalf("Authorization header not forwarded or incorrect: %s", authHeader)
			}
			if requestID != "req-123" {
				t.Fatalf("X-Request-ID header not forwarded or incorrect: %s", requestID)
			}

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			fmt.Fprint(w, `{"verified":true}`)
		}))
		defer mockServer.Close()

		cfg := &config.Config{
			Services: config.ServicesConfig{
				AuthService: config.ServiceEndpoint{URL: mockServer.URL, Timeout: 5, Retries: 1},
			},
		}
		proxy := NewProxy(cfg, &fakeLogger{})

		ctx, recorder := createMockGinContext("GET", "/api/v1/auth/verify", nil)
		ctx.Request.Header.Set("Authorization", "Bearer test-token")
		ctx.Request.Header.Set("X-Request-ID", "req-123")

		proxy.ProxyRequest(ctx)

		if recorder.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d", recorder.Code)
		}
	})

	// Test Case ID: TC-GW-PROXY-005
	// Mục tiêu: Service not found trả về 404 Not Found
	t.Run("service not found returns 404", func(t *testing.T) {
		cfg := &config.Config{
			Services: config.ServicesConfig{
				AuthService: config.ServiceEndpoint{URL: "http://auth", Timeout: 5, Retries: 1},
			},
		}
		proxy := NewProxy(cfg, &fakeLogger{})

		// Request to non-existent service path
		ctx, recorder := createMockGinContext("GET", "/api/v1/unknown-service/action", nil)
		proxy.ProxyRequest(ctx)

		if recorder.Code != http.StatusNotFound {
			t.Fatalf("expected status 404, got %d", recorder.Code)
		}
	})

	// Test Case ID: TC-GW-PROXY-006
	// Mục tiêu: Backend server error (500) được forward chính xác
	t.Run("backend server error is forwarded", func(t *testing.T) {
		mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			fmt.Fprint(w, `{"error":"Internal server error"}`)
		}))
		defer mockServer.Close()

		cfg := &config.Config{
			Services: config.ServicesConfig{
				PaymentService: config.ServiceEndpoint{URL: mockServer.URL, Timeout: 5, Retries: 1},
			},
		}
		proxy := NewProxy(cfg, &fakeLogger{})

		ctx, recorder := createMockGinContext("POST", "/api/v1/payments/confirm", bytes.NewReader([]byte(`{}`)))
		proxy.ProxyRequest(ctx)

		if recorder.Code != http.StatusInternalServerError {
			t.Fatalf("expected status 500, got %d", recorder.Code)
		}
	})

	// Test Case ID: TC-GW-PROXY-007
	// Mục tiêu: Empty request body được handle đúng
	t.Run("empty request body handling", func(t *testing.T) {
		mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			fmt.Fprint(w, `{"status":"ok"}`)
		}))
		defer mockServer.Close()

		cfg := &config.Config{
			Services: config.ServicesConfig{
				MovieService: config.ServiceEndpoint{URL: mockServer.URL, Timeout: 5, Retries: 1},
			},
		}
		proxy := NewProxy(cfg, &fakeLogger{})

		ctx, recorder := createMockGinContext("GET", "/api/v1/movies/list", nil)
		proxy.ProxyRequest(ctx)

		if recorder.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d", recorder.Code)
		}
	})

	// Test Case ID: TC-GW-PROXY-008
	// Mục tiêu: PATCH request với JSON body được forward
	t.Run("PATCH request with JSON body", func(t *testing.T) {
		mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method != "PATCH" {
				t.Fatalf("expected PATCH, got %s", r.Method)
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			fmt.Fprint(w, `{"updated":true}`)
		}))
		defer mockServer.Close()

		cfg := &config.Config{
			Services: config.ServicesConfig{
				BookingService: config.ServiceEndpoint{URL: mockServer.URL, Timeout: 5, Retries: 1},
			},
		}
		proxy := NewProxy(cfg, &fakeLogger{})

		payload := `{"status":"cancelled"}`
		ctx, recorder := createMockGinContext("PATCH", "/api/v1/bookings/B001", bytes.NewReader([]byte(payload)))
		proxy.ProxyRequest(ctx)

		if recorder.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d", recorder.Code)
		}
	})

	// Test Case ID: TC-GW-PROXY-009
	// Mục tiêu: DELETE request được forward với status code preservation
	t.Run("DELETE request forwarding with status preservation", func(t *testing.T) {
		mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method != "DELETE" {
				t.Fatalf("expected DELETE, got %s", r.Method)
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusNoContent)
		}))
		defer mockServer.Close()

		cfg := &config.Config{
			Services: config.ServicesConfig{
				BookingService: config.ServiceEndpoint{URL: mockServer.URL, Timeout: 5, Retries: 1},
			},
		}
		proxy := NewProxy(cfg, &fakeLogger{})

		ctx, recorder := createMockGinContext("DELETE", "/api/v1/bookings/B001", nil)
		proxy.ProxyRequest(ctx)

		if recorder.Code != http.StatusNoContent {
			t.Fatalf("expected status 204, got %d", recorder.Code)
		}
	})

	// Test Case ID: TC-GW-PROXY-010
	// Mục tiêu: Response headers (Content-Type, Set-Cookie) được copy từ backend
	t.Run("response headers are forwarded", func(t *testing.T) {
		mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("Set-Cookie", "session=abc123; Path=/")
			w.Header().Set("X-Custom-Header", "custom-value")
			w.WriteHeader(http.StatusOK)
			fmt.Fprint(w, `{"success":true}`)
		}))
		defer mockServer.Close()

		cfg := &config.Config{
			Services: config.ServicesConfig{
				AuthService: config.ServiceEndpoint{URL: mockServer.URL, Timeout: 5, Retries: 1},
			},
		}
		proxy := NewProxy(cfg, &fakeLogger{})

		ctx, recorder := createMockGinContext("GET", "/api/v1/auth/login", nil)
		proxy.ProxyRequest(ctx)

		if recorder.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d", recorder.Code)
		}
		if recorder.Header().Get("Content-Type") != "application/json" {
			t.Fatalf("Content-Type header not forwarded")
		}
		if !bytes.Contains([]byte(recorder.Header().Get("Set-Cookie")), []byte("session=abc123")) {
			t.Fatalf("Set-Cookie header not forwarded correctly")
		}
	})
}

// Lưu ý: Các hàm trên không tương tác DB nên không thực hiện CheckDB/Rollback.
// Phạm vi kiểm thử của dự án chỉ yêu cầu 21 test case (TC-GW-ROUTE-001 đến TC-GW-RES-021).
// Thêm 10 test case bổ sung (TC-GW-PROXY-001 đến TC-GW-PROXY-010) để tăng coverage.
// Tổng cộng: 31 test cases để đạt mục tiêu coverage ≥ 90%.

// TestHTTPMethodsAndErrorHandling: Kiểm tra xử lý các HTTP methods (PUT, DELETE, PATCH, UNSUPPORTED)
// và error handling paths.
func TestHTTPMethodsAndErrorHandling(t *testing.T) {
	// Test Case ID: TC-GW-METHOD-001
	// Mục tiêu: Xác nhận PUT request được forward chính xác
	t.Run("PUT request forwarding with body", func(t *testing.T) {
		mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method != "PUT" {
				t.Fatalf("expected PUT method, got %s", r.Method)
			}
			if r.URL.Path != "/api/v1/movies/1" {
				t.Fatalf("expected path /api/v1/movies/1, got %s", r.URL.Path)
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			fmt.Fprint(w, `{"id":"1","name":"Updated Movie"}`)
		}))
		defer mockServer.Close()

		cfg := &config.Config{
			Services: config.ServicesConfig{
				MovieService: config.ServiceEndpoint{URL: mockServer.URL, Timeout: 5, Retries: 1},
			},
		}
		proxy := NewProxy(cfg, &fakeLogger{})
		requestBody := bytes.NewBufferString(`{"name":"Updated Movie"}`)
		ctx, recorder := createMockGinContext("PUT", "/api/v1/movies/1", requestBody)

		proxy.ProxyRequest(ctx)

		if recorder.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d", recorder.Code)
		}
	})

	// Test Case ID: TC-GW-METHOD-002
	// Mục tiêu: Xác nhận DELETE request được forward chính xác
	t.Run("DELETE request forwarding", func(t *testing.T) {
		mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method != "DELETE" {
				t.Fatalf("expected DELETE method, got %s", r.Method)
			}
			if r.URL.Path != "/api/v1/movies/1" {
				t.Fatalf("expected path /api/v1/movies/1, got %s", r.URL.Path)
			}
			w.WriteHeader(http.StatusNoContent)
		}))
		defer mockServer.Close()

		cfg := &config.Config{
			Services: config.ServicesConfig{
				MovieService: config.ServiceEndpoint{URL: mockServer.URL, Timeout: 5, Retries: 1},
			},
		}
		proxy := NewProxy(cfg, &fakeLogger{})

		ctx, recorder := createMockGinContext("DELETE", "/api/v1/movies/1", nil)
		proxy.ProxyRequest(ctx)

		if recorder.Code != http.StatusNoContent {
			t.Fatalf("expected status 204, got %d", recorder.Code)
		}
	})

	// Test Case ID: TC-GW-METHOD-003
	// Mục tiêu: Xác nhận PATCH request được forward chính xác
	t.Run("PATCH request forwarding", func(t *testing.T) {
		mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method != "PATCH" {
				t.Fatalf("expected PATCH method, got %s", r.Method)
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			fmt.Fprint(w, `{"id":"1","status":"patched"}`)
		}))
		defer mockServer.Close()

		cfg := &config.Config{
			Services: config.ServicesConfig{
				BookingService: config.ServiceEndpoint{URL: mockServer.URL, Timeout: 5, Retries: 1},
			},
		}
		proxy := NewProxy(cfg, &fakeLogger{})
		requestBody := bytes.NewBufferString(`{"status":"confirmed"}`)
		ctx, recorder := createMockGinContext("PATCH", "/api/v1/bookings/1", requestBody)
		proxy.ProxyRequest(ctx)

		if recorder.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d", recorder.Code)
		}
	})

	// Test Case ID: TC-GW-METHOD-004
	// Mục tiêu: Unsupported HTTP method (HEAD) trả về 403 Forbidden
	t.Run("unsupported HTTP method returns 403 Forbidden", func(t *testing.T) {
		cfg := &config.Config{
			Services: config.ServicesConfig{
				AuthService: config.ServiceEndpoint{URL: "http://auth", Timeout: 5, Retries: 1},
			},
		}
		proxy := NewProxy(cfg, &fakeLogger{})

		ctx, recorder := createMockGinContext("HEAD", "/api/v1/auth/login", nil)
		proxy.ProxyRequest(ctx)

		if recorder.Code != http.StatusForbidden {
			t.Fatalf("expected status 403, got %d", recorder.Code)
		}
	})

	// Test Case ID: TC-GW-ERROR-001
	// Mục tiêu: Kiểm tra xử lý lỗi khi service không kết nối được
	t.Run("service connection error handling", func(t *testing.T) {
		cfg := &config.Config{
			Services: config.ServicesConfig{
				AuthService: config.ServiceEndpoint{URL: "http://unreachable-service:9999", Timeout: 1, Retries: 1},
			},
		}
		proxy := NewProxy(cfg, &fakeLogger{})

		ctx, recorder := createMockGinContext("GET", "/api/v1/auth/login", nil)
		proxy.ProxyRequest(ctx)

		// Khi service không kết nối được, trả về 500 Internal Server Error
		if recorder.Code != http.StatusInternalServerError {
			t.Fatalf("expected status 500, got %d", recorder.Code)
		}
	})
}

// TestHealthCheck: Kiểm tra HealthCheck() function để verify các service health endpoints.
func TestHealthCheck(t *testing.T) {
	// Test Case ID: TC-GW-HEALTH-001
	// Mục tiêu: HealthCheck returns map with all required services
	t.Run("health check returns all services", func(t *testing.T) {
		// Mock healthy backend server
		mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path == "/health" && r.Method == "GET" {
				w.WriteHeader(http.StatusOK)
				fmt.Fprint(w, `{"status":"healthy"}`)
				return
			}
			w.WriteHeader(http.StatusNotFound)
		}))
		defer mockServer.Close()

		cfg := &config.Config{
			Services: config.ServicesConfig{
				AuthService: config.ServiceEndpoint{
					URL:             mockServer.URL,
					HealthCheckPath: "/health",
					Timeout:         5,
					Retries:         1,
				},
				MovieService: config.ServiceEndpoint{
					URL:             mockServer.URL,
					HealthCheckPath: "/health",
					Timeout:         5,
					Retries:         1,
				},
				NotificationService: config.ServiceEndpoint{
					URL:             mockServer.URL,
					HealthCheckPath: "/health",
					Timeout:         5,
					Retries:         1,
				},
				UserService: config.ServiceEndpoint{
					URL:             mockServer.URL,
					HealthCheckPath: "/health",
					Timeout:         5,
					Retries:         1,
				},
				AnalyticsService: config.ServiceEndpoint{
					URL:             mockServer.URL,
					HealthCheckPath: "/health",
					Timeout:         5,
					Retries:         1,
				},
			},
		}
		proxy := NewProxy(cfg, &fakeLogger{})

		results := proxy.HealthCheck()

		// Verify all services are present in results
		expectedServices := []string{
			"auth-service",
			"movie-service",
			"notification-service",
			"user-service",
			"analytics-service",
		}

		for _, service := range expectedServices {
			if _, ok := results[service]; !ok {
				t.Fatalf("expected service %s in health check results", service)
			}
		}
	})

	// Test Case ID: TC-GW-HEALTH-002
	// Mục tiêu: Healthy service returns true
	t.Run("healthy service returns true status", func(t *testing.T) {
		mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			fmt.Fprint(w, `{"status":"ok"}`)
		}))
		defer mockServer.Close()

		cfg := &config.Config{
			Services: config.ServicesConfig{
				AuthService: config.ServiceEndpoint{
					URL:             mockServer.URL,
					HealthCheckPath: "/health",
					Timeout:         5,
					Retries:         1,
				},
				MovieService: config.ServiceEndpoint{
					URL:             "http://unreachable",
					HealthCheckPath: "/health",
					Timeout:         5,
					Retries:         1,
				},
				NotificationService: config.ServiceEndpoint{
					URL:             "http://unreachable",
					HealthCheckPath: "/health",
					Timeout:         5,
					Retries:         1,
				},
				UserService: config.ServiceEndpoint{
					URL:             "http://unreachable",
					HealthCheckPath: "/health",
					Timeout:         5,
					Retries:         1,
				},
				AnalyticsService: config.ServiceEndpoint{
					URL:             "http://unreachable",
					HealthCheckPath: "/health",
					Timeout:         5,
					Retries:         1,
				},
			},
		}
		proxy := NewProxy(cfg, &fakeLogger{})

		results := proxy.HealthCheck()

		// Verify auth-service is healthy
		if !results["auth-service"] {
			t.Fatalf("expected auth-service to be healthy")
		}
	})

	// Test Case ID: TC-GW-HEALTH-003
	// Mục tiêu: Unreachable service returns false
	t.Run("unreachable service returns false status", func(t *testing.T) {
		cfg := &config.Config{
			Services: config.ServicesConfig{
				AuthService: config.ServiceEndpoint{
					URL:             "http://unreachable-service:9999",
					HealthCheckPath: "/health",
					Timeout:         1,
					Retries:         1,
				},
				MovieService: config.ServiceEndpoint{
					URL:             "http://unreachable",
					HealthCheckPath: "/health",
					Timeout:         1,
					Retries:         1,
				},
				NotificationService: config.ServiceEndpoint{
					URL:             "http://unreachable",
					HealthCheckPath: "/health",
					Timeout:         1,
					Retries:         1,
				},
				UserService: config.ServiceEndpoint{
					URL:             "http://unreachable",
					HealthCheckPath: "/health",
					Timeout:         1,
					Retries:         1,
				},
				AnalyticsService: config.ServiceEndpoint{
					URL:             "http://unreachable",
					HealthCheckPath: "/health",
					Timeout:         1,
					Retries:         1,
				},
			},
		}
		proxy := NewProxy(cfg, &fakeLogger{})

		results := proxy.HealthCheck()

		// Verify auth-service is not healthy (unreachable)
		if results["auth-service"] {
			t.Fatalf("expected auth-service to be unhealthy")
		}
	})
}
