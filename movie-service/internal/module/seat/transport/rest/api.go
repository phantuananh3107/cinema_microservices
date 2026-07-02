package rest

import (
	"errors"
	"fmt"
	"strings"

	"movie-service/internal/module/seat/business"
	"movie-service/internal/module/seat/entity"
	"movie-service/internal/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/samber/do"
)

type handler struct {
	biz business.SeatBiz
}

func NewAPI(i *do.Injector) (*handler, error) {
	biz, err := do.Invoke[business.SeatBiz](i)
	if err != nil {
		return nil, err
	}

	return &handler{
		biz: biz,
	}, nil
}

func (h *handler) GetSeats(c *gin.Context) {
	var query entity.GetSeatsQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		response.BadRequest(c, fmt.Sprintf("Invalid query parameters: %s", err.Error()))
		return
	}

	if query.Page == 0 {
		query.Page = 1
	}
	if query.Size == 0 {
		query.Size = 10
	}

	query.SeatType = entity.SeatType(strings.ToUpper(string(query.SeatType)))
	query.Status = entity.SeatStatus(strings.ToUpper(string(query.Status)))

	seats, total, err := h.biz.GetSeats(c.Request.Context(), query.Page, query.Size, query.Search, query.RoomId, query.RowNumber, query.SeatType, query.Status)
	if err != nil {
		response.ErrorWithMessage(c, "Failed to get seats")
		return
	}

	resp := entity.ToSeatsResponse(seats, query.Page, query.Size, total)
	response.Success(c, resp)
}

func (h *handler) GetSeatById(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		response.BadRequest(c, "Seat ID is required")
		return
	}

	seat, err := h.biz.GetSeatById(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, business.ErrSeatNotFound) {
			response.NotFound(c, fmt.Errorf("seat not found"))
			return
		}

		response.ErrorWithMessage(c, "Failed to get seat")
		return
	}

	resp := entity.ToSeatResponse(seat)
	response.Success(c, resp)
}

func (h *handler) GetLockedSeats(c *gin.Context) {
	showtimeId := c.Query("showtime_id")
	if showtimeId == "" {
		response.BadRequest(c, "showtime_id query parameter is required")
		return
	}

	lockedSeatsResponse, err := h.biz.GetLockedSeatsByShowtime(c.Request.Context(), showtimeId)
	if err != nil {
		response.ErrorWithMessage(c, "Failed to get locked seats")
		return
	}

	response.Success(c, lockedSeatsResponse)
}

func (h *handler) CreateSeat(c *gin.Context) {
	var req entity.CreateSeatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, fmt.Sprintf("Invalid request body: %s", err.Error()))
		return
	}

	seat := req.ToSeat()
	if err := h.biz.CreateSeat(c.Request.Context(), seat); err != nil {
		if errors.Is(err, business.ErrSeatPositionExists) {
			response.BadRequest(c, "Seat position already exists in this room")
			return
		}

		response.ErrorWithMessage(c, "Failed to create seat")
		return
	}

	resp := entity.ToSeatResponse(seat)
	response.Created(c, resp)
}

func (h *handler) UpdateSeat(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		response.BadRequest(c, "Seat ID is required")
		return
	}

	var req entity.UpdateSeatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, fmt.Sprintf("Invalid request body: %s", err.Error()))
		return
	}

	if err := h.biz.UpdateSeat(c.Request.Context(), id, &req); err != nil {
		if errors.Is(err, business.ErrSeatNotFound) {
			response.NotFound(c, fmt.Errorf("seat not found"))
			return
		}
		if errors.Is(err, business.ErrSeatPositionExists) {
			response.BadRequest(c, "Seat position already exists in this room")
			return
		}
		if errors.Is(err, business.ErrInvalidStatusTransition) {
			response.BadRequest(c, "Invalid status transition")
			return
		}

		response.ErrorWithMessage(c, "Failed to update seat")
		return
	}

	seat, err := h.biz.GetSeatById(c.Request.Context(), id)
	if err != nil {
		response.ErrorWithMessage(c, "Failed to get updated seat")
		return
	}

	resp := entity.ToSeatResponse(seat)
	response.Success(c, resp)
}

func (h *handler) DeleteSeat(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		response.BadRequest(c, "Seat ID is required")
		return
	}

	if err := h.biz.DeleteSeat(c.Request.Context(), id); err != nil {
		response.ErrorWithMessage(c, "Failed to delete seat")
		return
	}

	response.NoContent(c)
}

func (h *handler) UpdateSeatStatus(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		response.BadRequest(c, "Seat ID is required")
		return
	}

	var req struct {
		Status entity.SeatStatus `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, fmt.Sprintf("Invalid request body: %s", err.Error()))
		return
	}

	if err := h.biz.UpdateSeatStatus(c.Request.Context(), id, req.Status); err != nil {
		if errors.Is(err, business.ErrSeatNotFound) {
			response.NotFound(c, fmt.Errorf("seat not found"))
			return
		}
		if errors.Is(err, business.ErrInvalidStatusTransition) {
			response.BadRequest(c, "Invalid status transition")
			return
		}

		response.ErrorWithMessage(c, "Failed to update seat status")
		return
	}

	seat, err := h.biz.GetSeatById(c.Request.Context(), id)
	if err != nil {
		response.ErrorWithMessage(c, "Failed to get updated seat")
		return
	}

	resp := entity.ToSeatResponse(seat)
	response.Success(c, resp)
}
