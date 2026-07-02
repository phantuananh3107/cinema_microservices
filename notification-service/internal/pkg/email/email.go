package email

import (
	"fmt"
	"net/smtp"
)

type EmailClient struct {
	EmailConfig *EmailConfig
}

func NewEmailClient(emailConfig *EmailConfig) (*EmailClient, error) {
	return &EmailClient{
		EmailConfig: emailConfig,
	}, nil
}

func (e *EmailClient) SendEmail(from, to string, msg []byte) error {
	addr := fmt.Sprintf("%s:%s", e.EmailConfig.SmtpHost, e.EmailConfig.SmtpPort)
	return smtp.SendMail(addr, e.auth(), from, []string{to}, msg)
}

func (e *EmailClient) SendEmailMulti(from string, to []string, msg []byte) error {
	var err error
	for _, t := range to {
		if err = e.SendEmail(from, t, msg); err != nil {
			return err
		}
	}
	return nil
}

func (e *EmailClient) auth() smtp.Auth {
	return smtp.PlainAuth("", e.EmailConfig.SmtpUser, e.EmailConfig.SmtpPassword, e.EmailConfig.SmtpHost)
}
