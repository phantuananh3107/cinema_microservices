package models

import "time"

type NotificationStatus string

const (
	NotificationStatusPending NotificationStatus = "PENDING"
	NotificationStatusSent    NotificationStatus = "SENT"
	NotificationStatusFailed  NotificationStatus = "FAILED"
	NotificationStatusRead    NotificationStatus = "READ"
	NotificationStatusDeleted NotificationStatus = "DELETED"
)

type NotificationTitle string

const (
	NotificationForgotPassword NotificationTitle = "Forgot Password"
	NotificationEmailVerified  NotificationTitle = "Email Verified"
	NotificationBookingSuccess NotificationTitle = "Booking Success"
)

type Notification struct {
	Id        string             `bun:"id,pk" json:"id"`
	UserId    string             `bun:"user_id" json:"user_id"`
	Title     NotificationTitle  `bun:"title" json:"title"`
	Content   string             `bun:"content" json:"content"`
	Status    NotificationStatus `bun:"status,default:'PENDING'" json:"status"`
	CreatedAt *time.Time         `bun:"created_at,default:current_timestamp" json:"created_at"`
	UpdatedAt *time.Time         `bun:"updated_at,default:current_timestamp" json:"updated_at"`
}
