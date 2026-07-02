package ws

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gorilla/websocket"
	"github.com/samber/do"
	"github.com/sirupsen/logrus"
)

const (
	pingInterval            = 30 * time.Second // interval at which we send a PING test
	pongWait                = 60 * time.Second // PONG timeout: we must receive PONG
	requestChannelCapacity  = 100
	responseChannelCapacity = 100
)

type WSConnection struct {
	ctx          context.Context
	baseCtx      context.Context
	cancel       context.CancelFunc
	wsconn       *websocket.Conn
	requestChan  chan *WSRequest
	responseChan chan *WSResponse
	handler      *WebSocketHandler
	running      uint32
	writeMu      sync.Mutex // Protects writes to wsconn
}

func NewWebSocketConnection(ctx context.Context, container *do.Injector, wsconn *websocket.Conn) (*WSConnection, error) {
	handler, err := NewWebSocketHandler(container)
	if err != nil {
		return nil, err
	}

	wsc := &WSConnection{
		baseCtx:      ctx,
		wsconn:       wsconn,
		requestChan:  make(chan *WSRequest, requestChannelCapacity),
		responseChan: make(chan *WSResponse, responseChannelCapacity),
		handler:      handler,
		running:      0,
	}

	// limit 2^20 = 1MB
	wsconn.SetReadLimit(1 << 20)
	wsconn.SetReadDeadline(time.Now().Add(pongWait))
	wsconn.SetPongHandler(wsc.pongHandler)

	return wsc, nil
}

func (wsc *WSConnection) Start() {
	if !atomic.CompareAndSwapUint32(&wsc.running, 0, 1) {
		logrus.Warn("WebSocket connection is already running")
		return
	}

	wg := new(sync.WaitGroup)
	wg.Add(1)
	go func() {
		defer wg.Done()
		err := wsc.handleRequests()
		if err != nil {
			wsc.CloseConnection()
			return
		}
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		_ = wsc.readMessage()
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		_ = wsc.writeMessage()
	}()

	wg.Wait()
}

func (wsc *WSConnection) Context() context.Context {
	if wsc.ctx != nil {
		return wsc.ctx
	}
	baseCtx := wsc.baseCtx
	if baseCtx == nil {
		baseCtx = context.Background()
	}
	wsc.ctx, wsc.cancel = context.WithCancel(baseCtx)
	return wsc.ctx
}

func (wsc *WSConnection) writeMessage() error {
	ticker := time.NewTicker(pingInterval)
	defer func() {
		ticker.Stop()
	}()

	ctx := wsc.Context()

	for {
		select {
		case msg, ok := <-wsc.responseChan:
			if !ok {
				return fmt.Errorf("websocket response message error")
			}

			if msg == nil {
				logrus.Warn("Response is nil")
				continue
			}

			rspByte, err := json.Marshal(msg)
			if err != nil {
				return err
			}

			wsc.writeMu.Lock()
			err = wsc.wsconn.WriteMessage(websocket.TextMessage, rspByte)
			wsc.writeMu.Unlock()
			if err != nil {
				return err
			}

		case <-ticker.C:
			logrus.Info("[WebSocket] Sending PING to client")
			wsc.writeMu.Lock()
			err := wsc.wsconn.WriteMessage(websocket.PingMessage, nil)
			wsc.writeMu.Unlock()
			if err != nil {
				logrus.Errorf("[WebSocket] Failed to send PING: %v", err)
				return err
			}

		case <-ctx.Done():
			logrus.Info("[WebSocket] Write goroutine stopping due to context cancellation")
			return nil
		}
	}
}

func (wsc *WSConnection) readMessage() error {
	for {
		msgType, payload, err := wsc.wsconn.ReadMessage()
		if err != nil {
			wsc.CloseConnection()
			return err
		}

		logrus.Printf("Received message type: %d content: %s\n", msgType, string(payload))

		msg := new(WSRequest)
		if err := json.Unmarshal(payload, msg); err != nil {
			return err
		}

		wsc.requestChan <- msg
	}
}

func (wsc *WSConnection) handleRequests() error {
	ctx := &WSContext{
		WSConn: wsc,
	}

	for request := range wsc.requestChan {
		switch request.Method {
		case "NOTIFICATION":
			response, err := wsc.handler.notificatonHandler(ctx, request)
			if err != nil {
				return err
			}

			wsc.sendMessage(response)
		default:
			return fmt.Errorf("websocket connection does not support this method")
		}
	}
	return nil
}

func (wsc *WSConnection) sendMessage(response *WSResponse) {
	if response == nil {
		return
	}
	select {
	case wsc.responseChan <- response:
		logrus.Printf("Sent response to client: %v", response)
	default:
		logrus.Printf("Dropped response to client: %v", response)
	}
}

func (wsc *WSConnection) CloseConnection() {
	if !atomic.CompareAndSwapUint32(&wsc.running, 1, 0) {
		logrus.Warn("WebSocket connection already closed")
		return
	}

	// Cancel context first to signal all goroutines to stop
	if wsc.ctx != nil {
		wsc.cancel()
	}

	// Close channels to signal goroutines
	close(wsc.requestChan)

	// Give a brief moment for write goroutine to notice context cancellation
	time.Sleep(10 * time.Millisecond)

	// Safely write close message with mutex protection
	wsc.writeMu.Lock()
	err := wsc.wsconn.WriteMessage(websocket.CloseMessage, nil)
	wsc.writeMu.Unlock()
	if err != nil {
		logrus.Warn(err)
	}

	if err := wsc.wsconn.Close(); err != nil {
		logrus.Warn(err)
		return
	}

	logrus.Info("WebSocket connection closed")
}

func (wsc *WSConnection) pongHandler(msg string) error {
	logrus.Info("[WebSocket] Received PONG from client, resetting read deadline")
	return wsc.wsconn.SetReadDeadline(time.Now().Add(pongWait))
}
