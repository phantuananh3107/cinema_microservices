package main

import (
	"payment-service/internal/container"
	"payment-service/internal/module/payment/transport/rest"
	"payment-service/middleware"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"github.com/urfave/cli/v2"
)

func ServeAPI() *cli.Command {
	return &cli.Command{
		Name:  "serve",
		Usage: "start payment service api",
		Action: func(c *cli.Context) error {
			router := gin.Default()
			router.Use(middleware.Cors())
			// router.Use(middleware.AuthMiddleware())

			v1 := router.Group("/api/v1")
			startRouteV1(v1)

			logrus.Info("Payment service api is running on port 8086")
			return router.Run(":8086")
		},
	}
}

func startRouteV1(group *gin.RouterGroup) {
	i := container.NewContainer()

	group.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "healthy",
			"service": "payment-service",
		})
	})

	paymentApi, err := rest.NewAPI(i)
	if err != nil {
		panic(err)
	}

	payments := group.Group("/payments")
	{
		payments.POST("", paymentApi.CreatePayment)
		payments.GET("/booking/:bookingId", paymentApi.GetPaymentByBookingId)
		payments.POST("/crypto/verify", paymentApi.VerifyCryptoPayment)
		payments.POST("/webhooks/sepay", paymentApi.SePayWebhook)
		payments.PATCH("/:paymentId/confirm", paymentApi.ConfirmPayment)
	}
}
