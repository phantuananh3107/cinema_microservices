package ws

import (
	"context"
	"encoding/json"
)

type WSContext struct {
	WSConn *WSConnection
}

func (ctx *WSContext) Context() context.Context {
	if ctx.WSConn != nil {
		return ctx.WSConn.Context()
	}
	return context.Background()
}

type WSRequest struct {
	Id     int             `json:"id"`
	Method string          `json:"method"`
	Params json.RawMessage `json:"params"` // must be map[string]interface{} or []interface{}
}

type WSResponse struct {
	Id     int             `json:"id"`
	Result json.RawMessage `json:"result,omitempty"` // must be map[string]interface{} or []interface{}
	Error  *WSError        `json:"error,omitempty"`
}

type WSError struct {
	Code    int    `json:"code"`
	Message string `json:"message,omitempty"`
	Data    string `json:"data,omitempty"`
}
