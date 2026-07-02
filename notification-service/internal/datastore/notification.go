package datastore

import (
	"context"
	"fmt"

	"notification-service/internal/models"

	"github.com/uptrace/bun"
)

func CreateNotificationTable(ctx context.Context, db *bun.DB) error {
	_, err := db.NewCreateTable().
		Model((*models.Notification)(nil)).
		IfNotExists().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to create notification table: %w", err)
	}

	return nil
}

// GetNotificationsByUserId retrieves notifications for a specific user with pagination
func GetNotificationsByUserId(ctx context.Context, db *bun.DB, userId string, limit, offset int) ([]*models.Notification, error) {
	notis := make([]*models.Notification, 0)

	err := db.NewSelect().
		Model(&notis).
		Where("user_id = ?", userId).
		Where("status IN (?, ?, ?)", models.NotificationStatusRead, models.NotificationStatusPending, models.NotificationStatusSent).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Scan(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get notifications by user id: %w", err)
	}

	return notis, nil
}

// GetNotificationsByUserIdAndStatus retrieves notifications for a specific user and status with pagination
func GetNotificationsByUserIdAndStatus(ctx context.Context, db *bun.DB, userId string, status models.NotificationStatus, limit, offset int) ([]*models.Notification, error) {
	notis := make([]*models.Notification, 0)

	err := db.NewSelect().
		Model(&notis).
		Where("user_id = ?", userId).
		Where("status = ?", status).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Scan(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get notifications by user id and status: %w", err)
	}

	return notis, nil
}

// GetTotalNotificationsByUserId returns total count of notifications for a user
func GetTotalNotificationsByUserId(ctx context.Context, db *bun.DB, userId string) (int, error) {
	count, err := db.NewSelect().
		Model((*models.Notification)(nil)).
		Where("user_id = ?", userId).
		Where("status IN (?, ?, ?)", models.NotificationStatusRead, models.NotificationStatusPending, models.NotificationStatusSent).
		Count(ctx)
	if err != nil {
		return 0, fmt.Errorf("failed to get total notifications count: %w", err)
	}

	return count, nil
}

// GetTotalNotificationsByUserIdAndStatus returns total count of notifications for a user with specific status
func GetTotalNotificationsByUserIdAndStatus(ctx context.Context, db *bun.DB, userId string, status models.NotificationStatus) (int, error) {
	count, err := db.NewSelect().
		Model((*models.Notification)(nil)).
		Where("user_id = ?", userId).
		Where("status = ?", status).
		Count(ctx)
	if err != nil {
		return 0, fmt.Errorf("failed to get total notifications count by status: %w", err)
	}

	return count, nil
}

// GetNotificationById retrieves a single notification by ID
func GetNotificationById(ctx context.Context, db *bun.DB, id string) (*models.Notification, error) {
	notification := &models.Notification{}

	err := db.NewSelect().
		Model(notification).
		Where("id = ?", id).
		Scan(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get notification by id: %w", err)
	}

	return notification, nil
}

// CreateNotification creates a new notification
func CreateNotification(ctx context.Context, db *bun.DB, notification *models.Notification) error {
	_, err := db.NewInsert().
		Model(notification).
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to create notification: %w", err)
	}

	return nil
}

// UpdateNotification updates an existing notification
func UpdateNotification(ctx context.Context, db *bun.DB, notification *models.Notification) error {
	_, err := db.NewUpdate().
		Model(notification).
		Where("id = ?", notification.Id).
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to update notification: %w", err)
	}

	return nil
}

// DeleteNotification deletes a notification (soft delete by updating status)
func DeleteNotification(ctx context.Context, db *bun.DB, id string) error {
	_, err := db.NewUpdate().
		Model((*models.Notification)(nil)).
		Set("status = ?", models.NotificationStatusDeleted).
		Where("id = ?", id).
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to delete notification: %w", err)
	}

	return nil
}

// MarkNotificationsAsRead marks multiple notifications as read
func MarkNotificationsAsRead(ctx context.Context, db *bun.DB, notificationIds []string, userId string) error {
	_, err := db.NewUpdate().
		Model((*models.Notification)(nil)).
		Set("status = ?", models.NotificationStatusRead).
		Where("id IN (?)", bun.In(notificationIds)).
		Where("user_id = ?", userId).
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to mark notifications as read: %w", err)
	}

	return nil
}
