# 🚀 Cinema API Gateway

A high-performance API Gateway for Cinema Management System built with Go and Gin framework.

## 🏗️ Architecture Overview

```
Frontend (React) → API Gateway → Microservices
                      ↓
           ┌──────────────────────────┐
           │      API Gateway         │
           │  - Authentication        │
           │  - Rate Limiting         │
           │  - Load Balancing        │
           │  - Request Routing       │
           │  - Monitoring            │
           └──────────────────────────┘
                      ↓
        ┌─────────────┬──────────────┬─────────────┐
        │             │              │             │
    Auth Service   Movie Service  Notification   ...
      :3001          :8080        Service :8081
```

## ✨ Features

### 🔐 Security
- **JWT Authentication** with configurable expiration
- **Role-based Authorization** (admin, staff, customer)
- **Rate Limiting** with Redis backend
- **CORS Configuration** with origin validation
- **Security Headers** (CSP, XSS Protection, HSTS)

### 🎯 Traffic Management
- **Intelligent Routing** based on URL patterns
- **Load Balancing** across service instances
- **Circuit Breaker** pattern for fault tolerance
- **Request/Response Transformation**
- **Health Checks** for all upstream services

### 📊 Observability
- **Prometheus Metrics** export
- **Structured Logging** with configurable levels
- **Request Tracing** with correlation IDs
- **Performance Monitoring**

### ⚡ Performance
- **High Throughput** with Gin framework
- **Connection Pooling** for upstream services
- **Response Caching** capabilities
- **Graceful Shutdown** with connection draining

## 🚀 Quick Start

### Prerequisites

- Go 1.21+
- Redis (for rate limiting and caching)
- Running microservices (auth, movie, notification)

### 1. Installation

```bash
git clone <repository>
cd api-gateway
go mod download
```

### 2. Configuration

Copy and customize the configuration:

```bash
cp config.yaml.example config.yaml
```

Key configuration sections:

```yaml
server:
  port: "8000"
  host: "0.0.0.0"

services:
  auth_service:
    url: "http://localhost:3001"
  movie_service:
    url: "http://localhost:8080"
  notification_service:
    url: "http://localhost:8081"

auth:
  jwt_secret: "${JWT_SECRET:your-secret-key}"
  public_paths:
    - "/api/auth/login"
    - "/api/auth/register" 
    - "/api/movies"

rate_limit:
  requests_per_second: 100
  burst_size: 200
```

### 3. Environment Variables

```bash
# Required
export JWT_SECRET="your-super-secret-jwt-key"

# Optional
export REDIS_URL="redis://localhost:6379"
export LOG_LEVEL="info"
```

### 4. Start the Gateway

```bash
go run cmd/api/main.go
```

## 📚 API Documentation

### 🔍 Gateway Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check for all services |
| GET | `/metrics` | Prometheus metrics |
| GET | `/api/gateway/info` | Gateway information |
| POST | `/api/auth/refresh` | Refresh JWT token |

### 🎬 Service Routes

#### Auth Service (`/api/auth/*`)
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration  
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/logout` - User logout

#### Movie Service (`/api/movies/*`, `/api/rooms/*`, `/api/seats/*`, `/api/showtimes/*`)
- `GET /api/movies` - List movies (public)
- `POST /api/movies` - Create movie (admin only)
- `GET /api/movies/:id` - Get movie details
- `PUT /api/movies/:id` - Update movie (admin only)
- `DELETE /api/movies/:id` - Delete movie (admin only)

#### Notification Service (`/api/notifications/*`, `/ws`)
- `GET /api/notifications/:userId` - Get user notifications
- `POST /api/notifications` - Create notification
- `PUT /api/notifications/:id` - Update notification
- `WebSocket /ws` - Real-time notifications

## 🔐 Authentication & Authorization

### JWT Token Format

```json
{
  "user_id": "uuid",
  "email": "user@example.com", 
  "role": "admin|staff|customer",
  "exp": 1234567890,
  "iat": 1234567890
}
```

### Usage Example

```bash
# Login to get token
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cinema.com","password":"password"}'

# Use token for authenticated requests  
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/movies
```

### Public vs Protected Routes

**Public Routes** (no authentication required):
- `/api/auth/login`
- `/api/auth/register`
- `/api/movies` (read-only)
- `/health`, `/metrics`

**Admin-Only Routes**:
- `/api/admin/*`
- `/api/movies/create`
- `/api/movies/*/update`
- `/api/movies/*/delete`

## ⚡ Rate Limiting

The gateway implements intelligent rate limiting:

### Configuration

```yaml
rate_limit:
  requests_per_second: 100  # Base limit
  burst_size: 200          # Allow bursts
  window_size: 60          # Window in seconds
```

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
Retry-After: 30
```

### Rate Limiting Strategy

- **Per-User**: Authenticated users get individual limits
- **Per-IP**: Anonymous users share IP-based limits  
- **Redis Backend**: Distributed rate limiting across instances
- **Graceful Degradation**: Falls back to in-memory limiting

## 📊 Monitoring & Observability

### Health Checks

```bash
curl http://localhost:8000/health
```

Response:
```json
{
  "status": "ok",
  "services": {
    "auth-service": true,
    "movie-service": true, 
    "notification-service": false
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### Prometheus Metrics

Available at `http://localhost:8000/metrics`

Key metrics:
- `http_requests_total` - Total HTTP requests
- `http_request_duration_seconds` - Request latencies
- `gateway_service_health` - Service health status
- `rate_limit_exceeded_total` - Rate limit violations

### Structured Logging

```json
{
  "level": "info",
  "msg": "Request proxied", 
  "method": "GET",
  "path": "/api/movies",
  "service": "movie-service",
  "status": 200,
  "response_time": "45.2ms",
  "user_id": "uuid"
}
```

## 🔧 Advanced Configuration

### Load Balancing

```yaml
services:
  movie_service:
    load_balancer:
      - "http://movie-service-1:8080"
      - "http://movie-service-2:8080" 
      - "http://movie-service-3:8080"
```

### Circuit Breaker

```yaml
circuit_breaker:
  failure_threshold: 5
  recovery_timeout: 30s
  request_timeout: 10s
```

### Custom Headers

The gateway automatically adds:
- `X-Request-ID`: Unique request identifier
- `X-Forwarded-For`: Original client IP
- `X-User-ID`: Authenticated user ID (if logged in)

## 🚨 Error Handling

### Standard Error Format

```json
{
  "error": "Authentication required",
  "code": "UNAUTHORIZED", 
  "timestamp": "2024-01-01T12:00:00Z",
  "request_id": "uuid"
}
```

### HTTP Status Codes

- `200 OK` - Successful request
- `400 Bad Request` - Invalid request format
- `401 Unauthorized` - Missing/invalid authentication
- `403 Forbidden` - Insufficient permissions  
- `429 Too Many Requests` - Rate limit exceeded
- `503 Service Unavailable` - Upstream service down

## 🐳 Docker Deployment

### Dockerfile

```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN go build -o gateway cmd/api/main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/gateway .
COPY --from=builder /app/config.yaml .
CMD ["./gateway"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  api-gateway:
    build: .
    ports:
      - "8000:8000"
    environment:
      - JWT_SECRET=your-secret-key
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
      - auth-service
      - movie-service

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

## 📈 Performance Tuning

### Recommended Settings

```yaml
server:
  read_timeout: 30
  write_timeout: 30  
  idle_timeout: 120

rate_limit:
  requests_per_second: 1000  # Adjust based on capacity
  burst_size: 2000
```

### Production Optimizations

- Enable HTTP/2
- Use connection pooling
- Configure proper timeouts
- Enable response compression
- Set up caching layers

## 🔒 Security Best Practices

1. **JWT Secrets**: Use strong, random secrets (32+ characters)
2. **HTTPS Only**: Always use TLS in production
3. **Rate Limiting**: Configure appropriate limits  
4. **CORS**: Restrict origins to trusted domains
5. **Headers**: Enable all security headers
6. **Validation**: Validate all inputs and tokens
7. **Monitoring**: Monitor for suspicious activity

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

---

## 🚀 Ready for Production!

The Cinema API Gateway is production-ready with:

- ✅ **High Performance** - Built with Go and Gin
- ✅ **Enterprise Security** - JWT, RBAC, Rate Limiting  
- ✅ **Full Observability** - Metrics, Logging, Health Checks
- ✅ **Cloud Native** - Docker, Kubernetes ready
- ✅ **Fault Tolerant** - Circuit breakers, graceful degradation

**Start building your cinema platform today!** 🎬