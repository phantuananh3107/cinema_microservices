package models

import (
	"time"

	"github.com/uptrace/bun"
)

type NotificationStatus string

const (
	NotificationStatusPending NotificationStatus = "PENDING"
	NotificationStatusSent    NotificationStatus = "SENT"
	NotificationStatusFailed  NotificationStatus = "FAILED"
	NotificationStatusRead    NotificationStatus = "READ"
	NotificationStatusDeleted NotificationStatus = "DELETED"
)

type Notification struct {
	bun.BaseModel `bun:"table:notifications,alias:n"`

	Id        string             `bun:"id,pk" json:"id"`
	UserId    string             `bun:"user_id" json:"user_id"`
	Title     string             `bun:"title" json:"title"`
	Content   string             `bun:"content" json:"content"`
	Status    NotificationStatus `bun:"status" json:"status"`
	CreatedAt *time.Time         `bun:"created_at,default:current_timestamp" json:"created_at"`
	UpdatedAt *time.Time         `bun:"updated_at,default:current_timestamp" json:"updated_at"`
}
