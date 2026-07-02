package ws

import (
	"encoding/json"
	"fmt"

	"notification-service/internal/pkg/pubsub"
	"notification-service/internal/services"
	"notification-service/internal/types"

	"github.com/samber/do"
)

type WebSocketHandler struct {
	containier          *do.Injector
	pubsub              pubsub.PubSub
	notificationService *services.NotificationService
}

func NewWebSocketHandler(container *do.Injector) (*WebSocketHandler, error) {
	pubsub, err := do.Invoke[pubsub.PubSub](container)
	if err != nil {
		return nil, err
	}

	notificationService, err := do.Invoke[*services.NotificationService](container)
	if err != nil {
		return nil, err
	}

	return &WebSocketHandler{
		containier:          container,
		pubsub:              pubsub,
		notificationService: notificationService,
	}, nil
}

func (h *WebSocketHandler) notificatonHandler(ctx *WSContext, request *WSRequest) (*WSResponse, error) {
	if request.Id <= 0 {
		return &WSResponse{
			Id:     request.Id,
			Result: nil,
			Error:  &WSError{Code: 400, Message: "Invalid request Id"},
		}, nil
	}

	params := make(map[string]interface{})
	if err := json.Unmarshal(request.Params, &params); err != nil {
		return &WSResponse{
			Id:     request.Id,
			Result: nil,
			Error:  &WSError{Code: 400, Message: "Invalid params"},
		}, nil
	}

	userId, ok := params["userId"].(string)
	if !ok || userId == "" {
		return &WSResponse{
			Id:     request.Id,
			Result: nil,
			Error:  &WSError{Code: 400, Message: "Missing or invalid userId"},
		}, nil
	}

	// Subscribe to both notification_<userId> and booking_<userId> topics
	topics := []string{
		notificationTopic(userId),
		bookingNotificationTopic(userId),
	}

	subscriber, err := h.pubsub.Subscribe(ctx.Context(), topics, types.UnmarshalGenericMessage)
	if err != nil {
		return &WSResponse{
			Id:     request.Id,
			Result: nil,
			Error:  &WSError{Code: 500, Message: "Failed to subscribe to topic"},
		}, err
	}

	go func() {
		defer func() {
			_ = subscriber.Unsubscribe(ctx.Context())
		}()

		messageChan := subscriber.MessageChan()
		for {
			select {
			case <-ctx.Context().Done():
				fmt.Println("Context done, stopping subscriber")
				return
			case msg := <-messageChan:
				switch msg.Topic {
				case notificationTopic(userId):
					ctx.WSConn.sendMessage(&WSResponse{
						Id:     request.Id,
						Result: json.RawMessage(`{"type": "notification", "status": "sent"}`),
						Error:  nil,
					})
				case bookingNotificationTopic(userId):
					notificationData, ok := msg.Data.(map[string]interface{})
					if !ok {
						fmt.Printf("Invalid notification data type: %T\n", msg.Data)
						continue
					}

					title := ""
					if titleVal, ok := notificationData["title"].(string); ok {
						title = titleVal
					}

					message := ""
					if msgVal, ok := notificationData["message"].(string); ok {
						message = msgVal
					}

					if title != "" && message != "" {
						go h.notificationService.CreateNotification(ctx.Context(), userId, title, message)
					}

					responseData, _ := json.Marshal(map[string]interface{}{
						"type":   "booking_notification",
						"data":   notificationData,
						"status": "sent",
					})

					ctx.WSConn.sendMessage(&WSResponse{
						Id:     request.Id,
						Result: responseData,
						Error:  nil,
					})
				}
			}
		}
	}()

	return &WSResponse{
		Id:     request.Id,
		Result: json.RawMessage(`{"status": "success", "message": "Subscribed to notifications"}`),
		Error:  nil,
	}, nil
}
