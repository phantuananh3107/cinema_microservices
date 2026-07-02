package response

import (
	"net/http"

	"github.com/labstack/echo/v4"
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

func Success(c echo.Context, data interface{}) error {
	return c.JSON(http.StatusOK, APIResponse{
		Code:    http.StatusOK,
		Message: "Success",
		Data:    data,
	})
}

func SuccessWithMessage(c echo.Context, message string, data interface{}) error {
	return c.JSON(http.StatusOK, APIResponse{
		Code:    http.StatusOK,
		Message: message,
		Data:    data,
	})
}

func Created(c echo.Context, data interface{}) error {
	return c.JSON(http.StatusCreated, APIResponse{
		Code:    http.StatusCreated,
		Message: "Created successfully",
		Data:    data,
	})
}

func NoContent(c echo.Context) error {
	return c.NoContent(http.StatusNoContent)
}

func BadRequest(c echo.Context, message string) error {
	return c.JSON(http.StatusBadRequest, ErrorResponse{
		Code:    http.StatusBadRequest,
		Message: "Bad Request",
		Error:   message,
	})
}

func NotFound(c echo.Context, err error) error {
	return c.JSON(http.StatusNotFound, ErrorResponse{
		Code:    http.StatusNotFound,
		Message: "Not Found",
		Error:   err.Error(),
	})
}

func InternalServerError(c echo.Context, message string) error {
	return c.JSON(http.StatusInternalServerError, ErrorResponse{
		Code:    http.StatusInternalServerError,
		Message: "Internal Server Error",
		Error:   message,
	})
}

func ErrorWithMessage(c echo.Context, message string) error {
	return c.JSON(http.StatusInternalServerError, ErrorResponse{
		Code:    http.StatusInternalServerError,
		Message: message,
	})
}

func Unauthorized(c echo.Context, message string) error {
	return c.JSON(http.StatusUnauthorized, ErrorResponse{
		Code:    http.StatusUnauthorized,
		Message: "Unauthorized",
		Error:   message,
	})
}

func Forbidden(c echo.Context, message string) error {
	return c.JSON(http.StatusForbidden, ErrorResponse{
		Code:    http.StatusForbidden,
		Message: "Forbidden",
		Error:   message,
	})
}
