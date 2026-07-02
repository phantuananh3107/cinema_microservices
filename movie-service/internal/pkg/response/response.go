package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type ApiResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Message string      `json:"message,omitempty"`
	Error   interface{} `json:"error,omitempty"`
}

func Success(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, ApiResponse{
		Success: true,
		Data:    data,
	})
}

func Created(c *gin.Context, data interface{}) {
	c.JSON(http.StatusCreated, ApiResponse{
		Success: true,
		Data:    data,
	})
}

func NoContent(c *gin.Context) {
	c.JSON(http.StatusNoContent, ApiResponse{
		Success: true,
	})
}

func BadRequest(c *gin.Context, message string) {
	c.JSON(http.StatusBadRequest, ApiResponse{
		Success: false,
		Message: message,
	})
}

func NotFound(c *gin.Context, err error) {
	c.JSON(http.StatusNotFound, ApiResponse{
		Success: false,
		Message: "Resource not found",
		Error:   err.Error(),
	})
}

func ErrorWithMessage(c *gin.Context, message string) {
	c.JSON(http.StatusInternalServerError, ApiResponse{
		Success: false,
		Message: message,
	})
}

func Error(c *gin.Context, err error) {
	c.JSON(http.StatusInternalServerError, ApiResponse{
		Success: false,
		Message: "Internal server error",
		Error:   err.Error(),
	})
}

func Unauthorized(c *gin.Context, message string) {
	c.JSON(http.StatusUnauthorized, ApiResponse{
		Success: false,
		Message: message,
	})
}

func Forbidden(c *gin.Context, message string) {
	c.JSON(http.StatusForbidden, ApiResponse{
		Success: false,
		Message: message,
	})
}

func Conflict(c *gin.Context, message string) {
	c.JSON(http.StatusConflict, ApiResponse{
		Success: false,
		Message: message,
	})
}
