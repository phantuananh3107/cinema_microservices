package handlers

import (
	"net/http"

	"booking-service/internal/grpc"
	internalMiddleware "booking-service/internal/middleware"
	"booking-service/internal/pkg/caching"

	"github.com/labstack/echo-contrib/pprof"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/samber/do"
)

type Config struct {
	Container *do.Injector
	Mode      string
	Origins   []string
}

func New(cfg *Config) (http.Handler, error) {
	r := echo.New()
	r.Pre(middleware.RemoveTrailingSlash())
	if cfg.Mode == "debug" {
		r.Debug = true
		pprof.Register(r)
	}

	r.IPExtractor = echo.ExtractIPFromXFFHeader()

	r.Use(middleware.LoggerWithConfig(middleware.LoggerConfig{
		Format: "${time_rfc3339}\t${method}\t${uri}\t${status}\t${latency_human}\n",
	}))
	r.Use(middleware.Recover())
	r.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins:     cfg.Origins,
		AllowHeaders:     []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization},
		AllowCredentials: true,
		MaxAge:           60 * 60,
	}))

	routesAPIv1 := r.Group("/api/v1")
	{
		bookingHandler, err := NewBookingHandler(cfg.Container)
		if err != nil {
			return nil, err
		}

		authClient, err := do.Invoke[*grpc.AuthClient](cfg.Container)
		if err != nil {
			return nil, err
		}

		cacheService, err := do.Invoke[caching.Cache](cfg.Container)
		if err != nil {
			return nil, err
		}

		routesBooking := routesAPIv1.Group("/bookings")
		{
			routesBooking.GET("/me", bookingHandler.GetBookings, internalMiddleware.RequireAuth(authClient, cacheService))
			routesBooking.GET("/:id", bookingHandler.GetBookingByID, internalMiddleware.RequireAuth(authClient, cacheService))
			routesBooking.POST("", bookingHandler.CreateBooking, internalMiddleware.RequireAuth(authClient, cacheService))
		}

		routesTicket := routesAPIv1.Group("/tickets")
		{
			routesTicket.GET("/search", bookingHandler.SearchTickets, internalMiddleware.RequireAuth(authClient, cacheService))
			routesTicket.PATCH("/:id/mark-used", bookingHandler.MarkTicketAsUsed, internalMiddleware.RequireAuth(authClient, cacheService))
		}
	}

	return r, nil
}
