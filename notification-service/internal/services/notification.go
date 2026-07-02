package services

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"notification-service/internal/datastore"
	"notification-service/internal/models"

	"github.com/google/uuid"
	"github.com/samber/do"
	"github.com/uptrace/bun"
)

var (
	ErrInvalidNotificationData = fmt.Errorf("invalid notification data")
	ErrNotificationNotFound    = fmt.Errorf("notification not found")
	ErrUnauthorized            = fmt.Errorf("unauthorized access")
)

type NotificationService struct {
	container *do.Injector
	db        *bun.DB
	roDb      *bun.DB
}

func NewNotificationService(container *do.Injector) (*NotificationService, error) {
	db, err := do.Invoke[*bun.DB](container)
	if err != nil {
		return nil, err
	}

	roDb, err := do.InvokeNamed[*bun.DB](container, "readonly-db")
	if err != nil {
		return nil, err
	}

	return &NotificationService{
		container: container,
		db:        db,
		roDb:      roDb,
	}, nil
}

func (s *NotificationService) GetUserNotifications(ctx context.Context, userId string, page, size int, status string) ([]*models.Notification, int, error) {
	if userId == "" {
		return nil, 0, ErrInvalidNotificationData
	}

	if page <= 0 {
		page = 1
	}
	if size <= 0 {
		size = 10
	}
	if size > 100 {
		size = 100
	}

	limit := size
	offset := (page - 1) * size

	var notifications []*models.Notification
	var total int
	var err error

	if status != "" && s.isValidStatus(status) {
		notificationStatus := models.NotificationStatus(status)
		notifications, err = datastore.GetNotificationsByUserIdAndStatus(ctx, s.roDb, userId, notificationStatus, limit, offset)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to get notifications by status: %w", err)
		}

		total, err = datastore.GetTotalNotificationsByUserIdAndStatus(ctx, s.roDb, userId, notificationStatus)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to get total count by status: %w", err)
		}
	} else {
		notifications, err = datastore.GetNotificationsByUserId(ctx, s.roDb, userId, limit, offset)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to get notifications: %w", err)
		}

		total, err = datastore.GetTotalNotificationsByUserId(ctx, s.roDb, userId)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to get total count: %w", err)
		}
	}

	return notifications, total, nil
}

func (s *NotificationService) GetNotificationById(ctx context.Context, id string, userId string) (*models.Notification, error) {
	if id == "" || userId == "" {
		return nil, ErrInvalidNotificationData
	}

	notification, err := datastore.GetNotificationById(ctx, s.roDb, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotificationNotFound
		}
		return nil, fmt.Errorf("failed to get notification: %w", err)
	}

	if notification.UserId != userId {
		return nil, ErrUnauthorized
	}

	return notification, nil
}

func (s *NotificationService) CreateNotification(ctx context.Context, userId, title, content string) (*models.Notification, error) {
	if userId == "" || title == "" || content == "" {
		return nil, ErrInvalidNotificationData
	}

	notification := &models.Notification{
		Id:      uuid.New().String(),
		UserId:  userId,
		Title:   models.NotificationTitle(title),
		Content: content,
		Status:  models.NotificationStatusPending,
	}

	err := datastore.CreateNotification(ctx, s.db, notification)
	if err != nil {
		return nil, fmt.Errorf("failed to create notification: %w", err)
	}

	return notification, nil
}

func (s *NotificationService) UpdateNotificationStatus(ctx context.Context, id string, userId string, status models.NotificationStatus) error {
	if id == "" || userId == "" {
		return ErrInvalidNotificationData
	}

	notification, err := s.GetNotificationById(ctx, id, userId)
	if err != nil {
		return err
	}

	notification.Status = status

	return datastore.UpdateNotification(ctx, s.db, notification)
}

func (s *NotificationService) DeleteNotification(ctx context.Context, id string, userId string) error {
	if id == "" || userId == "" {
		return ErrInvalidNotificationData
	}

	_, err := s.GetNotificationById(ctx, id, userId)
	if err != nil {
		return err
	}

	err = datastore.DeleteNotification(ctx, s.db, id)
	if err != nil {
		return fmt.Errorf("failed to delete notification: %w", err)
	}

	return nil
}

func (s *NotificationService) MarkNotificationsAsRead(ctx context.Context, userId string, notificationIds []string) error {
	if userId == "" || len(notificationIds) == 0 {
		return ErrInvalidNotificationData
	}

	return datastore.MarkNotificationsAsRead(ctx, s.db, notificationIds, userId)
}

func (s *NotificationService) GetUnreadCount(ctx context.Context, userId string) (int, error) {
	if userId == "" {
		return 0, ErrInvalidNotificationData
	}

	count, err := datastore.GetTotalNotificationsByUserIdAndStatus(ctx, s.roDb, userId, models.NotificationStatusPending)
	if err != nil {
		return 0, err
	}

	return count, nil
}

func (s *NotificationService) isValidStatus(status string) bool {
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
