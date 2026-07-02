package handlers

import (
	"errors"
	"fmt"
	"strings"

	"notification-service/internal/models"
	"notification-service/internal/pkg/response"
	"notification-service/internal/services"
	"notification-service/internal/types"

	"github.com/labstack/echo/v4"
	"github.com/samber/do"
)

type NotificationHandler struct {
	container *do.Injector
}

func NewNotificationHandler(i *do.Injector) (*NotificationHandler, error) {
	return &NotificationHandler{
		container: i,
	}, nil
}

// GetNotifications handles GET /api/notifications/:userId with pagination
func (h *NotificationHandler) GetNotifications(c echo.Context) error {
	notiService, err := do.Invoke[*services.NotificationService](h.container)
	if err != nil {
		return response.InternalServerError(c, "Failed to get notification service")
	}

	var query types.GetNotificationsQuery
	if err := c.Bind(&query); err != nil {
		return response.BadRequest(c, fmt.Sprintf("Invalid query parameters: %s", err.Error()))
	}

	userId := c.Param("userId")
	if userId == "" {
		return response.BadRequest(c, "User ID is required")
	}

	// Set defaults for pagination
	if query.Page == 0 {
		query.Page = 1
	}
	if query.Size == 0 {
		query.Size = 10
	}

	query.Status = strings.ToUpper(query.Status)

	notifications, total, err := notiService.GetUserNotifications(c.Request().Context(), userId, query.Page, query.Size, query.Status)
	if err != nil {
		if errors.Is(err, services.ErrInvalidNotificationData) {
			return response.BadRequest(c, "Invalid request data")
		}
		return response.ErrorWithMessage(c, "Failed to get notifications")
	}

	resp := types.ToNotificationsResponse(notifications, query.Page, query.Size, total)
	return response.SuccessWithMessage(c, "Notifications fetched successfully", resp)
}

// GetNotificationById handles GET /api/notifications/:userId/:id
func (h *NotificationHandler) GetNotificationById(c echo.Context) error {
	notiService, err := do.Invoke[*services.NotificationService](h.container)
	if err != nil {
		return response.InternalServerError(c, "Failed to get notification service")
	}

	userId := c.Param("userId")
	id := c.Param("id")

	if userId == "" || id == "" {
		return response.BadRequest(c, "User ID and Notification ID are required")
	}

	notification, err := notiService.GetNotificationById(c.Request().Context(), id, userId)
	if err != nil {
		if errors.Is(err, services.ErrNotificationNotFound) {
			return response.NotFound(c, fmt.Errorf("notification not found"))
		}
		if errors.Is(err, services.ErrUnauthorized) {
			return response.Unauthorized(c, "Access denied")
		}
		return response.ErrorWithMessage(c, "Failed to get notification")
	}

	resp := types.ToNotificationResponse(notification)
	return response.Success(c, resp)
}

// CreateNotification handles POST /api/notifications
func (h *NotificationHandler) CreateNotification(c echo.Context) error {
	notiService, err := do.Invoke[*services.NotificationService](h.container)
	if err != nil {
		return response.InternalServerError(c, "Failed to get notification service")
	}

	var req types.CreateNotificationRequest
	if err := c.Bind(&req); err != nil {
		return response.BadRequest(c, fmt.Sprintf("Invalid request body: %s", err.Error()))
	}

	notification, err := notiService.CreateNotification(c.Request().Context(), req.UserID, req.Title, req.Content)
	if err != nil {
		if errors.Is(err, services.ErrInvalidNotificationData) {
			return response.BadRequest(c, "Invalid notification data")
		}
		return response.ErrorWithMessage(c, "Failed to create notification")
	}

	resp := types.ToNotificationResponse(notification)
	return response.Created(c, resp)
}

// UpdateNotificationStatus handles PUT /api/notifications/:userId/:id/status
func (h *NotificationHandler) UpdateNotificationStatus(c echo.Context) error {
	notiService, err := do.Invoke[*services.NotificationService](h.container)
	if err != nil {
		return response.InternalServerError(c, "Failed to get notification service")
	}

	userId := c.Param("userId")
	id := c.Param("id")

	if userId == "" || id == "" {
		return response.BadRequest(c, "User ID and Notification ID are required")
	}

	var req types.UpdateNotificationRequest
	if err := c.Bind(&req); err != nil {
		return response.BadRequest(c, fmt.Sprintf("Invalid request body: %s", err.Error()))
	}

	if req.Status == nil {
		return response.BadRequest(c, "Status is required")
	}

	if !types.ValidateStatus(*req.Status) {
		return response.BadRequest(c, "Invalid status")
	}

	err = notiService.UpdateNotificationStatus(c.Request().Context(), id, userId, models.NotificationStatus(*req.Status))
	if err != nil {
		if errors.Is(err, services.ErrNotificationNotFound) {
			return response.NotFound(c, fmt.Errorf("notification not found"))
		}
		if errors.Is(err, services.ErrUnauthorized) {
			return response.Unauthorized(c, "Access denied")
		}
		return response.ErrorWithMessage(c, "Failed to update notification status")
	}

	return response.SuccessWithMessage(c, "Notification status updated successfully", nil)
}

// DeleteNotification handles DELETE /api/notifications/:userId/:id
func (h *NotificationHandler) DeleteNotification(c echo.Context) error {
	notiService, err := do.Invoke[*services.NotificationService](h.container)
	if err != nil {
		return response.InternalServerError(c, "Failed to get notification service")
	}

	userId := c.Param("userId")
	id := c.Param("id")

	if userId == "" || id == "" {
		return response.BadRequest(c, "User ID and Notification ID are required")
	}

	err = notiService.DeleteNotification(c.Request().Context(), id, userId)
	if err != nil {
		if errors.Is(err, services.ErrNotificationNotFound) {
			return response.NotFound(c, fmt.Errorf("notification not found"))
		}
		if errors.Is(err, services.ErrUnauthorized) {
			return response.Unauthorized(c, "Access denied")
		}
		return response.ErrorWithMessage(c, "Failed to delete notification")
	}

	return response.NoContent(c)
}

// MarkAsRead handles POST /api/notifications/:userId/mark-read
func (h *NotificationHandler) MarkAsRead(c echo.Context) error {
	notiService, err := do.Invoke[*services.NotificationService](h.container)
	if err != nil {
		return response.InternalServerError(c, "Failed to get notification service")
	}

	userId := c.Param("userId")
	if userId == "" {
		return response.BadRequest(c, "User ID is required")
	}

	var req types.MarkAsReadRequest
	if err := c.Bind(&req); err != nil {
		return response.BadRequest(c, fmt.Sprintf("Invalid request body: %s", err.Error()))
	}

	err = notiService.MarkNotificationsAsRead(c.Request().Context(), userId, req.NotificationIDs)
	if err != nil {
		if errors.Is(err, services.ErrInvalidNotificationData) {
			return response.BadRequest(c, "Invalid request data")
		}
		return response.ErrorWithMessage(c, "Failed to mark notifications as read")
	}

	return response.SuccessWithMessage(c, "Notifications marked as read", nil)
}

// GetUnreadCount handles GET /api/notifications/:userId/unread-count
func (h *NotificationHandler) GetUnreadCount(c echo.Context) error {
	notiService, err := do.Invoke[*services.NotificationService](h.container)
	if err != nil {
		return response.InternalServerError(c, "Failed to get notification service")
	}

	userId := c.Param("userId")
	if userId == "" {
		return response.BadRequest(c, "User ID is required")
	}

	count, err := notiService.GetUnreadCount(c.Request().Context(), userId)
	if err != nil {
		return response.ErrorWithMessage(c, "Failed to get unread count")
	}

	return response.Success(c, map[string]int{"unread_count": count})
}
