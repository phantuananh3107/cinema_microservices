package ws

import "fmt"

func notificationTopic(userId string) string {
	return fmt.Sprintf("notification_%s", userId)
}

func bookingNotificationTopic(userId string) string {
	return fmt.Sprintf("booking_%s", userId)
}
