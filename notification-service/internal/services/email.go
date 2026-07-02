package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	"notification-service/internal/datastore"
	"notification-service/internal/models"
	"notification-service/internal/pkg/email"
	"notification-service/internal/pkg/pubsub"
	"notification-service/internal/types"

	"github.com/google/uuid"
	"github.com/samber/do"
	"github.com/sirupsen/logrus"
	"github.com/uptrace/bun"
)

type EmailService struct {
	container    *do.Injector
	readonlyDb   *bun.DB
	db           *bun.DB
	pubsub       pubsub.PubSub
	Notification *NotificationService
	emailClient  *email.EmailClient
}

func NewEmailService(i *do.Injector) (*EmailService, error) {
	readonlyDb, err := do.InvokeNamed[*bun.DB](i, "readonly-db")
	if err != nil {
		return nil, err
	}

	db, err := do.Invoke[*bun.DB](i)
	if err != nil {
		return nil, err
	}

	emailClient, err := email.NewEmailClient(email.NewEmailConfig())
	if err != nil {
		return nil, err
	}

	ps, err := do.Invoke[pubsub.PubSub](i)
	if err != nil {
		return nil, err
	}

	return &EmailService{
		container:   i,
		readonlyDb:  readonlyDb,
		db:          db,
		emailClient: emailClient,
		pubsub:      ps,
	}, nil
}

type emailTemplate struct {
	Subject     string
	BodyFunc    func(data any) string
	NotiTitle   models.NotificationTitle
	NotiContent string
}

var emailTemplates = map[string]emailTemplate{
	"email_verify": {
		Subject:     "Verify your email",
		BodyFunc:    verifyEmailBody,
		NotiTitle:   models.NotificationEmailVerified,
		NotiContent: "Please verify your email with code",
	},
	"forgot_password": {
		Subject:     "Forgot your password?",
		BodyFunc:    forgotPasswordBody,
		NotiTitle:   models.NotificationForgotPassword,
		NotiContent: "Please reset your password with code",
	},
	"booking_success": {
		Subject:     "Booking success",
		BodyFunc:    bookingSuccessBody,
		NotiTitle:   models.NotificationBookingSuccess,
		NotiContent: "Scan the bar code to get tickets",
	},
	"staff_welcome": {
		Subject:     "Welcome to HQ Cinema Staff",
		BodyFunc:    staffWelcomeBody,
		NotiTitle:   models.NotificationEmailVerified,
		NotiContent: "Your staff account has been created",
	},
}

type TopicHandler struct {
	Topics      []string
	UnmarshalFn func([]byte) (interface{}, error)
	HandleFn    func(ctx context.Context, msg *pubsub.Message) error
}

func (e *EmailService) SubscribeEmailNotificationQueue(ctx context.Context) error {
	handlers := []TopicHandler{
		{
			Topics:      []string{"email_verify", "forgot_password"},
			UnmarshalFn: types.UnmarshalEmailVerify,
			HandleFn:    e.handleTemplatedEmail,
		},
		{
			Topics:      []string{"booking_success"},
			UnmarshalFn: types.UnmarshalBookingSuccess,
			HandleFn:    e.handleTemplatedEmail,
		},
		{
			Topics:      []string{"staff_welcome"},
			UnmarshalFn: types.UnmarshalStaffWelcome,
			HandleFn:    e.handleTemplatedEmail,
		},
	}

	for _, h := range handlers {
		if err := e.subscribeAndHandle(ctx, h); err != nil {
			return err
		}
	}
	return nil
}

func (e *EmailService) subscribeAndHandle(ctx context.Context, h TopicHandler) error {
	sub, err := e.pubsub.Subscribe(ctx, h.Topics, h.UnmarshalFn)
	if err != nil {
		return fmt.Errorf("subscribe %v: %w", h.Topics, err)
	}
	logrus.Infof("Subscribed to topics: %v", h.Topics)

	go e.consumeLoop(ctx, sub, h.HandleFn)
	return nil
}

func (e *EmailService) consumeLoop(ctx context.Context, sub pubsub.Subscriber, handler func(context.Context, *pubsub.Message) error) {
	defer func() {
		if err := sub.Unsubscribe(ctx); err != nil {
			logrus.Warnf("unsubscribe error: %v", err)
		}
	}()

	messageChan := sub.MessageChan()

	for {
		select {
		case <-ctx.Done():
			logrus.Info("stopping subscriber")
			return
		case msg := <-messageChan:
			if err := handler(ctx, msg); err != nil {
				logrus.Warnf("handle msg topic=%s err=%v", msg.Topic, err)
			}
		default:
			time.Sleep(1 * time.Second)
		}
	}
}

func (e *EmailService) handleTemplatedEmail(ctx context.Context, msg *pubsub.Message) error {
	tmpl, ok := emailTemplates[msg.Topic]
	if !ok {
		return fmt.Errorf("no template for topic %s", msg.Topic)
	}

	// Extract and sanitize email addresses
	toEmail := extractToEmail(msg)
	toEmail = strings.ReplaceAll(toEmail, "\r", "")
	toEmail = strings.ReplaceAll(toEmail, "\n", "")
	toEmail = strings.TrimSpace(toEmail)

	if toEmail == "" {
		return fmt.Errorf("recipient email is empty for topic %s", msg.Topic)
	}

	payload := types.EmailPayload{
		From:    e.emailClient.EmailConfig.SmtpFrom,
		To:      toEmail,
		Subject: tmpl.Subject,
		Body:    tmpl.BodyFunc(msg.Data),
	}

	if err := e.sendEmail(payload); err != nil {
		return fmt.Errorf("send email [%s]: %w", msg.Topic, err)
	}

	go e.createNotificationAsync(ctx, extractUserID(msg), tmpl.NotiTitle, tmpl.NotiContent)

	return nil
}

func extractToEmail(msg *pubsub.Message) string {
	switch data := msg.Data.(type) {
	case *types.EmailVerifyMessage:
		return data.To
	case *types.BookingSuccessMessage:
		if data.To != "" {
			return data.To
		}
		return data.UserEmail
	case *types.StaffWelcomeMessage:
		return data.To
	}
	return ""
}

func extractUserID(msg *pubsub.Message) string {
	switch data := msg.Data.(type) {
	case *types.EmailVerifyMessage:
		return data.UserId
	case *types.BookingSuccessMessage:
		return data.UserId
	case *types.StaffWelcomeMessage:
		return data.UserId
	}
	return ""
}

func (e *EmailService) sendEmail(p types.EmailPayload) error {
	headers := fmt.Sprintf(
		"MIME-Version: 1.0\r\n"+
			"Content-Type: text/html; charset=\"UTF-8\"\r\n"+
			"From: %s\r\n"+
			"To: %s\r\n"+
			"Subject: %s\r\n",
		p.From, p.To, p.Subject,
	)

	// Ensure body uses proper line endings (SMTP requires \r\n)
	// Replace all \n with \r\n, but avoid double \r\r\n
	body := p.Body
	body = strings.ReplaceAll(body, "\r\n", "\n") // Normalize first
	body = strings.ReplaceAll(body, "\n", "\r\n") // Then convert to SMTP format

	// Combine headers and body with proper separator
	msg := headers + "\r\n" + body

	return e.emailClient.SendEmail(p.From, p.To, []byte(msg))
}

func (e *EmailService) createNotificationAsync(ctx context.Context, userID string, title models.NotificationTitle, content string) {
	if err := datastore.CreateNotification(ctx, e.db, &models.Notification{
		Id:      uuid.NewString(),
		UserId:  userID,
		Title:   title,
		Content: content,
		Status:  models.NotificationStatusSent,
	}); err != nil {
		logrus.Warnf("create notification failed: %v", err)
	}
}

func verifyEmailBody(data any) string {
	m := data.(*types.EmailVerifyMessage)
	return renderVerifyEmail(m.VerifyCode, m.VerifyURL)
}

func forgotPasswordBody(data any) string {
	m := data.(*types.EmailVerifyMessage)
	return renderForgotPassword(m.VerifyCode, m.VerifyURL)
}

func bookingSuccessBody(data any) string {
	m := data.(*types.BookingSuccessMessage)
	return renderBookingSuccess(m)
}

func staffWelcomeBody(data any) string {
	m := data.(*types.StaffWelcomeMessage)
	return renderStaffWelcome(m)
}

func renderVerifyEmail(otp, url string) string {
	return emailTemplateHTML("🎬 Welcome to HQ Cinema", `
		<p>Thank you for signing up! Verify your account:</p>
		<h3>🔐 OTP Code:</h3>
		<p class="otp">`+otp+`</p>
		<p>OR click below:</p>
		<a href="`+url+`" class="btn">Verify My Account</a>
	`)
}

func renderForgotPassword(otp, url string) string {
	return emailTemplateHTML("🔑 Password Reset Request", `
		<p>Reset your password:</p>
		<h3>📮 OTP Code:</h3>
		<p class="otp">`+otp+`</p>
		<p>OR click below:</p>
		<a href="`+url+`" class="btn">Reset My Password</a>
	`)
}

func renderBookingSuccess(m *types.BookingSuccessMessage) string {
	barcodeURL := fmt.Sprintf("https://bwipjs-api.metafloor.com/?bcid=code128&text=%s&scale=3&height=15&includetext", m.BookingId)
	seats := renderSeats(m.Seats)
	showtime := renderShowtime(&m.Showtime)

	return emailTemplateHTML("🎬 Booking Confirmed!", fmt.Sprintf(`
		<p>Your booking is confirmed!</p>
		<div class="code-block">
			<h3>Your Booking Code</h3>
			<p class="code">%s</p>
		</div>
		<h3 style="text-align:center;">📱 Show this barcode</h3>
		<div class="barcode">
			<img src="%s" alt="Barcode" />
		</div>
		%s %s
		<div class="tip">
			<strong>💡 Important:</strong> Arrive 15 mins early. Show barcode at counter.
		</div>
		<p>Enjoy your movie!</p>
	`, m.BookingId, barcodeURL, showtime, seats))
}

func renderStaffWelcome(m *types.StaffWelcomeMessage) string {
	return emailTemplateHTML("Welcome to HQ Cinema Team!", fmt.Sprintf(`
		<p>Welcome aboard, <strong>%s</strong>!</p>
		<p>Your staff account has been created successfully. You can now access the cinema management system.</p>
		<div class="section">
			<h3>Your Login Credentials</h3>
			<p><strong>Email:</strong> %s</p>
			<p><strong>Password:</strong> <span class="otp">%s</span></p>
			<p><strong>Role:</strong> %s</p>
		</div>
		<div class="tip">
			<strong>Important:</strong> Please change your password after your first login for security purposes.
		</div>
		<p>If you have any questions, please contact your manager.</p>
	`, m.Name, m.Email, m.Password, m.Role))
}

func renderSeats(seats []types.SeatInfo) string {
	if len(seats) == 0 {
		return ""
	}
	html := `<div class="section"><h3>🎟️ Your Seats:</h3><div class="seats">`
	for _, s := range seats {
		html += fmt.Sprintf(`<span class="seat">%s-%d (%s)</span>`, s.SeatRow, s.SeatNumber, s.SeatType)
	}
	return html + `</div></div>`
}

func renderShowtime(st *types.ShowtimeInfo) string {
	if st.MovieName == "" {
		return ""
	}
	return fmt.Sprintf(`
		<div class="section movie">
			<h3>🎬 Movie Details:</h3>
			<p><strong>Movie:</strong> %s</p>
			<p><strong>Room:</strong> %s</p>
			<p><strong>Showtime:</strong> %s</p>
		</div>`, st.MovieName, st.RoomName, st.StartTime)
}

func emailTemplateHTML(title, content string) string {
	return `
<html>
  <head>
    <style>
      body {font-family: Arial, sans-serif; background:#f4f4f4; padding:20px;}
      .wrapper {max-width:600px; margin:auto; background:#fff; border-radius:10px; padding:30px; box-shadow:0 4px 8px rgba(0,0,0,0.1);}
      h2 {color:#e50914;}
      .btn {display:inline-block; padding:12px 24px; background:#e50914; color:#fff; text-decoration:none; border-radius:5px; font-weight:bold;}
      .otp {font-size:24px; font-weight:bold; background:#f1f1f1; padding:10px 20px; border-radius:8px; display:inline-block;}
      .code-block {background:linear-gradient(135deg,#e50914,#b20710); padding:20px; border-radius:10px; text-align:center; color:#fff;}
      .code {font-size:28px; font-weight:bold; letter-spacing:4px;}
      .barcode {text-align:center; background:#f9f9f9; padding:20px; border-radius:8px;}
      .section {margin:20px 0; background:#f0f0f0; padding:15px; border-radius:8px;}
      .seats {padding:10px;}
      .seat {display:inline-block; background:#e50914; color:#fff; padding:8px 15px; margin:5px; border-radius:5px; font-weight:bold;}
      .tip {background:#fff3cd; border-left:4px solid #ffc107; padding:15px; color:#856404;}
    </style>
  </head>
  <body>
    <div class="wrapper">
      <h2>` + title + `</h2>
      <p>Hi there,</p>
      ` + content + `
      <p>– The HQ Cinema Team</p>
    </div>
  </body>
</html>`
}
