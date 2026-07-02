package handlers

import (
	"net/http"

	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v4"
	"github.com/samber/do"

	"notification-service/internal/handlers/ws"
)

type groupWebSocket struct {
	container *do.Injector
	upgrader  *websocket.Upgrader
}

func NewGroupWebSocket(container *do.Injector) *groupWebSocket {
	return &groupWebSocket{
		container: container,
		upgrader: &websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			CheckOrigin: func(r *http.Request) bool {
				return true
			},
		},
	}
}

func (g *groupWebSocket) WebsocketHandleConnection(c echo.Context) error {
	w := c.Response()
	r := c.Request()
	conn, err := g.upgrader.Upgrade(w, r, nil)
	if err != nil {
		c.Logger().Errorf("Failed to upgrade WebSocket connection: %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to establish WebSocket connection")
	}

	wsConn, err := ws.NewWebSocketConnection(r.Context(), g.container, conn)
	if err != nil {
		c.Logger().Errorf("Failed to create WebSocket connection: %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to create WebSocket connection")
	}
	defer wsConn.CloseConnection()

	wsConn.Start()

	return nil
}
