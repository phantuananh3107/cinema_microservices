package types

import (
	"encoding/json"
	"time"

	"notification-service/internal/models"
	"notification-service/internal/pkg/paging"
)

type GetNotificationsResponse struct {
	Notifications []*models.Notification `json:"notifications"`
	Total         int                    `json:"total"`
}

// GetNotificationsQuery represents query parameters for fetching notifications
type GetNotificationsQuery struct {
	Page   int    `query:"page"`
	Size   int    `query:"size"`
	Status string `query:"status"`
	UserId string `query:"user_id"`
}

// NotificationResponse represents a single notification response
type NotificationResponse struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Title     string    `json:"title"`
	Content   string    `json:"content"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// NotificationsResponse represents paginated notifications response
type NotificationsResponse struct {
	Notifications []*NotificationResponse `json:"notifications"`
	PageInfo      *paging.PageInfo        `json:"page_info"`
}

// CreateNotificationRequest represents request to create a notification
type CreateNotificationRequest struct {
	UserID  string `json:"user_id" validate:"required"`
	Title   string `json:"title" validate:"required,max=255"`
	Content string `json:"content" validate:"required"`
}

// UpdateNotificationRequest represents request to update a notification
type UpdateNotificationRequest struct {
	Title   *string `json:"title,omitempty" validate:"omitempty,max=255"`
	Content *string `json:"content,omitempty"`
	Status  *string `json:"status,omitempty"`
}

// MarkAsReadRequest represents request to mark notifications as read
type MarkAsReadRequest struct {
	NotificationIDs []string `json:"notification_ids" validate:"required"`
}

// ToNotificationResponse converts model to response
func ToNotificationResponse(notification *models.Notification) *NotificationResponse {
	response := &NotificationResponse{
		ID:      notification.Id,
		UserID:  notification.UserId,
		Title:   string(notification.Title),
		Content: notification.Content,
		Status:  string(notification.Status),
	}

	if notification.CreatedAt != nil {
		response.CreatedAt = *notification.CreatedAt
	}

	if notification.UpdatedAt != nil {
		response.UpdatedAt = *notification.UpdatedAt
	}

	return response
}

// ToNotificationsResponse converts slice of models to paginated response
func ToNotificationsResponse(notifications []*models.Notification, page, size, total int) *NotificationsResponse {
	responses := make([]*NotificationResponse, 0, len(notifications))
	for _, notification := range notifications {
		responses = append(responses, ToNotificationResponse(notification))
	}

	return &NotificationsResponse{
		Notifications: responses,
		PageInfo:      paging.NewPageInfo(page, size, total),
	}
}

// ToEntity converts create request to model
func (req *CreateNotificationRequest) ToEntity() *models.Notification {
	now := time.Now()
	return &models.Notification{
		UserId:    req.UserID,
		Title:     models.NotificationTitle(req.Title),
		Content:   req.Content,
		Status:    models.NotificationStatusPending,
		CreatedAt: &now,
		UpdatedAt: &now,
	}
}

// ApplyUpdates applies update request to existing notification
func (req *UpdateNotificationRequest) ApplyUpdates(notification *models.Notification) {
	now := time.Now()

	if req.Title != nil {
		notification.Title = models.NotificationTitle(*req.Title)
	}

	if req.Content != nil {
		notification.Content = *req.Content
	}

	if req.Status != nil {
		notification.Status = models.NotificationStatus(*req.Status)
	}

	notification.UpdatedAt = &now
}

// ValidateStatus checks if status is valid
func ValidateStatus(status string) bool {
	switch models.NotificationStatus(status) {
	case models.NotificationStatusPending,
		models.NotificationStatusSent,
		models.NotificationStatusFailed,
		models.NotificationStatusRead,
		models.NotificationStatusDeleted:
		return true
	default:
		return false
	}
}

type NotificationMessage struct {
	UserId  string `json:"user_id"`
	Title   string `json:"title"`
	Content string `json:"content"`
}

func UnmarshalNotificationMessage(data []byte) (interface{}, error) {
	msg := new(NotificationMessage)
	if err := json.Unmarshal(data, msg); err != nil {
		return nil, err
	}
	return msg, nil
}

func UnmarshalGenericMessage(data []byte) (interface{}, error) {
	var msg map[string]interface{}
	if err := json.Unmarshal(data, &msg); err != nil {
		return nil, err
	}
	return msg, nil
}
