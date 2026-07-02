package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type APIResponse struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

type ErrorResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Error   string `json:"error,omitempty"`
}

// Success responses
func Success(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, APIResponse{
		Code:    http.StatusOK,
		Message: "Success",
		Data:    data,
	})
}

func SuccessWithMessage(c *gin.Context, message string, data interface{}) {
	c.JSON(http.StatusOK, APIResponse{
		Code:    http.StatusOK,
		Message: message,
		Data:    data,
	})
}

func Created(c *gin.Context, data interface{}) {
	c.JSON(http.StatusCreated, APIResponse{
		Code:    http.StatusCreated,
		Message: "Created successfully",
		Data:    data,
	})
}

func NoContent(c *gin.Context) {
	c.Status(http.StatusNoContent)
}

// BadRequest Error responses
func BadRequest(c *gin.Context, message string) {
	c.JSON(http.StatusBadRequest, ErrorResponse{
		Code:    http.StatusBadRequest,
		Message: "Bad Request",
		Error:   message,
	})
}

func BadRequestWithCode(c *gin.Context, message string, errorCode string) {
	c.JSON(http.StatusBadRequest, gin.H{
		"code":      http.StatusBadRequest,
		"message":   "Bad Request",
		"error":     message,
		"errorCode": errorCode,
	})
}

func Unauthorized(c *gin.Context, message string) {
	c.JSON(http.StatusUnauthorized, ErrorResponse{
		Code:    http.StatusUnauthorized,
		Message: "Unauthorized",
		Error:   message,
	})
}

func UnauthorizedWithCode(c *gin.Context, message string, errorCode string) {
	c.JSON(http.StatusUnauthorized, gin.H{
		"code":      http.StatusUnauthorized,
		"message":   "Unauthorized",
		"error":     message,
		"errorCode": errorCode,
	})
}

func Forbidden(c *gin.Context, message string) {
	c.JSON(http.StatusForbidden, ErrorResponse{
		Code:    http.StatusForbidden,
		Message: "Forbidden",
		Error:   message,
	})
}

func ForbiddenWithCode(c *gin.Context, message string, errorCode string) {
	c.JSON(http.StatusForbidden, gin.H{
		"code":      http.StatusForbidden,
		"message":   "Forbidden",
		"error":     message,
		"errorCode": errorCode,
	})
}

func NotFound(c *gin.Context, message string) {
	c.JSON(http.StatusNotFound, ErrorResponse{
		Code:    http.StatusNotFound,
		Message: "Not Found",
		Error:   message,
	})
}

func InternalServerError(c *gin.Context, message string) {
	c.JSON(http.StatusInternalServerError, ErrorResponse{
		Code:    http.StatusInternalServerError,
		Message: "Internal Server Error",
		Error:   message,
	})
}

// Rate limiting specific response
func TooManyRequests(c *gin.Context, message string, retryAfter int64) {
	c.JSON(http.StatusTooManyRequests, gin.H{
		"code":        http.StatusTooManyRequests,
		"message":     "Too Many Requests",
		"error":       message,
		"errorCode":   "RATE_LIMIT_EXCEEDED",
		"retry_after": retryAfter,
	})
}

// Custom error with specific error code
func ErrorWithCode(c *gin.Context, statusCode int, message string, errorCode string) {
	c.JSON(statusCode, gin.H{
		"code":      statusCode,
		"message":   http.StatusText(statusCode),
		"error":     message,
		"errorCode": errorCode,
	})
}
