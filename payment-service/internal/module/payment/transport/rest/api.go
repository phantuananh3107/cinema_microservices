package rest

import (
	"fmt"
	"net/http"

	"payment-service/internal/module/payment/business"
	"payment-service/internal/module/payment/entity"

	"github.com/gin-gonic/gin"
	"github.com/samber/do"
)

type handler struct {
	paymentBiz business.PaymentBiz
}

func NewAPI(i *do.Injector) (*handler, error) {
	paymentBiz, err := do.Invoke[business.PaymentBiz](i)
	if err != nil {
		return nil, err
	}

	return &handler{
		paymentBiz: paymentBiz,
	}, nil
}

func (h *handler) CreatePayment(c *gin.Context) {
	var req struct {
		BookingId string  `json:"booking_id" binding:"required"`
		Amount    float64 `json:"amount" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request payload",
		})
		return
	}

	payment, err := h.paymentBiz.CreatePayment(c.Request.Context(), req.BookingId, req.Amount)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to create payment",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    payment,
	})
}

func (h *handler) GetPaymentByBookingId(c *gin.Context) {
	bookingId := c.Param("bookingId")
	if bookingId == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Booking ID is required",
		})
		return
	}

	payment, err := h.paymentBiz.GetPaymentByBookingId(c.Request.Context(), bookingId)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Payment not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    payment,
	})
}

func (h *handler) SePayWebhook(c *gin.Context) {
	webhook := new(entity.SePayWebhook)
	if err := c.ShouldBindJSON(webhook); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid webhook payload",
		})
		return
	}

	if webhook.Id == 0 || webhook.Gateway == "" || webhook.TransferAmount == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Missing required fields",
		})
		return
	}

	fmt.Println("webhook data:", webhook)

	err := h.paymentBiz.ProcessSePayWebhook(c.Request.Context(), webhook)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to process webhook",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
	})
}

func (h *handler) VerifyCryptoPayment(c *gin.Context) {
	var req entity.CryptoVerificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request payload",
			"error":   err.Error(),
		})
		return
	}

	err := h.paymentBiz.VerifyCryptoPayment(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to verify crypto payment",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Crypto payment verified successfully",
	})
}

func (h *handler) ConfirmPayment(c *gin.Context) {
	paymentId := c.Param("paymentId")
	if paymentId == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Payment ID is required",
		})
		return
	}

	var req struct {
		PaymentMethod string `json:"payment_method" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request payload",
		})
		return
	}

	paymentMethod := entity.PaymentMethod(req.PaymentMethod)
	if paymentMethod != entity.PaymentMethodCash &&
	   paymentMethod != entity.PaymentMethodBankTransfer &&
	   paymentMethod != entity.PaymentMethodCryptoCurrency {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid payment method",
		})
		return
	}

	err := h.paymentBiz.ConfirmPayment(c.Request.Context(), paymentId, paymentMethod)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to confirm payment",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Payment confirmed successfully",
	})
}
