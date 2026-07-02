package email

import (
	"os"

	"notification-service/internal/utils/env"
)

type EmailConfig struct {
	SmtpHost     string
	SmtpPort     string
	SmtpUser     string
	SmtpPassword string
	SmtpFrom     string
}

func NewEmailConfig() *EmailConfig {
	_, err := env.EnvsRequired(
		"EMAIL_SMTP_HOST",
		"EMAIL_SMTP_PORT",
		"EMAIL_SMTP_USER",
		"EMAIL_SMTP_PASSWORD",
		"EMAIL_FROM",
	)
	if err != nil {
		panic(err)
	}

	host := os.Getenv("EMAIL_SMTP_HOST")
	port := os.Getenv("EMAIL_SMTP_PORT")
	user := os.Getenv("EMAIL_SMTP_USER")
	password := os.Getenv("EMAIL_SMTP_PASSWORD")
	from := os.Getenv("EMAIL_FROM")

	return &EmailConfig{
		SmtpHost:     host,
		SmtpPort:     port,
		SmtpUser:     user,
		SmtpPassword: password,
		SmtpFrom:     from,
	}
}
