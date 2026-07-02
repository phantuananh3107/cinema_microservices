package handlers

import (
	"errors"
	"fmt"
	"strings"

	"booking-service/internal/models"
	"booking-service/internal/pkg/response"
	"booking-service/internal/services"

	"github.com/labstack/echo/v4"
	"github.com/samber/do"
)

type BookingHandler struct {
	container *do.Injector
}

func NewBookingHandler(i *do.Injector) (*BookingHandler, error) {
	return &BookingHandler{
		container: i,
	}, nil
}

func (h *BookingHandler) GetBookings(c echo.Context) error {
	bookingService, err := do.Invoke[*services.BookingService](h.container)
	if err != nil {
		return response.InternalServerError(c, "Failed to get booking service")
	}

	var query struct {
		Page   int    `query:"page"`
		Size   int    `query:"size"`
		Status string `query:"status"`
	}
	if err = c.Bind(&query); err != nil {
		return response.BadRequest(c, fmt.Sprintf("Invalid query parameters: %s", err.Error()))
	}

	userId := c.Get("user_id").(string)
	if userId == "" {
		return response.Unauthorized(c, "User ID not found in token")
	}

	if query.Page == 0 {
		query.Page = 1
	}
	if query.Size == 0 {
		query.Size = 10
	}

	query.Status = strings.ToUpper(query.Status)

	bookings, total, err := bookingService.GetUserBookings(c.Request().Context(), userId, query.Page, query.Size, query.Status)
	if err != nil {
		if errors.Is(err, services.ErrInvalidBookingData) {
			return response.BadRequest(c, "Invalid request data")
		}
		return response.ErrorWithMessage(c, "Failed to get bookings")
	}

	responseData := map[string]interface{}{
		"bookings": bookings,
		"total":    total,
		"page":     query.Page,
		"size":     query.Size,
	}

	return response.SuccessWithMessage(c, "Bookings fetched successfully", responseData)
}

func (h *BookingHandler) CreateBooking(c echo.Context) error {
	bookingService, err := do.Invoke[*services.BookingService](h.container)
	if err != nil {
		return response.InternalServerError(c, "Failed to get booking service")
	}

	var request struct {
		ShowtimeId  string   `json:"showtime_id" validate:"required,uuid"`
		SeatIds     []string `json:"seat_ids" validate:"required,dive,uuid"`
		TotalAmount int      `json:"total_amount"`
		BookingType string   `json:"booking_type"`
	}

	if err = c.Bind(&request); err != nil {
		return response.BadRequest(c, "Invalid request data")
	}

	userId := c.Get("user_id").(string)
	if userId == "" {
		return response.Unauthorized(c, "User ID not found in token")
	}

	bookingType := "ONLINE"
	if request.BookingType != "" {
		bookingType = strings.ToUpper(request.BookingType)
	}

	if bookingType == "OFFLINE" {
		userRole, ok := c.Get("userRole").(string)
		if !ok || (userRole != "ticket_staff" && userRole != "admin" && userRole != "manager_staff") {
			return response.Forbidden(c, "Only ticket staff, managers, and admins can create box office bookings")
		}
	}

	booking, err := bookingService.CreateBooking(c.Request().Context(), userId, request.ShowtimeId, request.SeatIds, request.TotalAmount, models.BookingType(bookingType))
	if err != nil {
		if errors.Is(err, services.ErrInvalidBookingData) {
			return response.BadRequest(c, "Invalid booking data")
		}

		if errors.Is(err, services.ErrSeatAlreadyBooked) {
			return response.BadRequest(c, "Seat already booked")
		}

		if errors.Is(err, services.ErrSeatAlreadyLocked) {
			return response.BadRequest(c, "Seat is being processed")
		}

		return response.ErrorWithMessage(c, fmt.Sprintf("Failed to create booking: %s", err.Error()))
	}

	return response.SuccessWithMessage(c, "Booking created successfully", booking)
}

func (h *BookingHandler) GetBookingByID(c echo.Context) error {
	bookingService, err := do.Invoke[*services.BookingService](h.container)
	if err != nil {
		return response.InternalServerError(c, "Failed to get booking service")
	}

	bookingId := c.Param("id")
	if bookingId == "" {
		return response.BadRequest(c, "Booking ID is required")
	}

	booking, err := bookingService.GetBookingByID(c.Request().Context(), bookingId)
	if err != nil {
		if errors.Is(err, services.ErrBookingNotFound) {
			return response.NotFound(c, services.ErrBookingNotFound)
		}
		return response.ErrorWithMessage(c, "Failed to get booking")
	}

	return response.SuccessWithMessage(c, "Booking fetched successfully", booking)
}

func (h *BookingHandler) SearchTickets(c echo.Context) error {
	bookingService, err := do.Invoke[*services.BookingService](h.container)
	if err != nil {
		return response.InternalServerError(c, "Failed to get booking service")
	}

	var query struct {
		BookingId  string `query:"booking_id"`
		ShowtimeId string `query:"showtime_id"`
	}
	if err := c.Bind(&query); err != nil {
		return response.BadRequest(c, fmt.Sprintf("Invalid query parameters: %s", err.Error()))
	}

	tickets, err := bookingService.SearchTickets(c.Request().Context(), query.BookingId, query.ShowtimeId)
	if err != nil {
		fmt.Printf("ERROR SearchTickets: %v\n", err)
		return response.ErrorWithMessage(c, fmt.Sprintf("Failed to search tickets: %s", err.Error()))
	}

	return response.SuccessWithMessage(c, "Tickets fetched successfully", map[string]interface{}{
		"tickets": tickets,
	})
}

func (h *BookingHandler) MarkTicketAsUsed(c echo.Context) error {
	bookingService, err := do.Invoke[*services.BookingService](h.container)
	if err != nil {
		return response.InternalServerError(c, "Failed to get booking service")
	}

	ticketId := c.Param("id")
	if ticketId == "" {
		return response.BadRequest(c, "Ticket ID is required")
	}

	err = bookingService.MarkTicketAsUsed(c.Request().Context(), ticketId)
	if err != nil {
		if errors.Is(err, services.ErrTicketNotFound) {
			return response.NotFound(c, services.ErrTicketNotFound)
		}
		return response.ErrorWithMessage(c, fmt.Sprintf("Failed to mark ticket as used: %s", err.Error()))
	}

	return response.SuccessWithMessage(c, "Ticket marked as used successfully", nil)
}
