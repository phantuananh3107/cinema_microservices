package types

import (
	"github.com/labstack/echo/v4"
)

type Body struct {
	Code    int    `json:"code,omitempty"`
	Message string `json:"message,omitempty"`
	Data    any    `json:"data,omitempty"`
}

func ResponseWithMessage(c echo.Context, b *Body) error {
	return c.JSON(b.Code, b)
}
