package rest

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"movie-service/internal/module/showtime/business"
	"movie-service/internal/module/showtime/entity"
	"movie-service/internal/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/samber/do"
)

type handler struct {
	biz business.ShowtimeBiz
}

func NewAPI(i *do.Injector) (*handler, error) {
	biz, err := do.Invoke[business.ShowtimeBiz](i)
	if err != nil {
		return nil, err
	}

	return &handler{
		biz: biz,
	}, nil
}

func (h *handler) GetShowtimes(c *gin.Context) {
	var query entity.GetShowtimesQuery
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

	query.Format = entity.ShowtimeFormat(strings.ToUpper(string(query.Format)))
	query.Status = entity.ShowtimeStatus(strings.ToUpper(string(query.Status)))

	var dateFrom, dateTo *time.Time
	if query.DateFrom != "" {
		parsed, err := time.Parse("2006-01-02", query.DateFrom)
		if err != nil {
			response.BadRequest(c, "Invalid date_from format, use YYYY-MM-DD")
			return
		}
		dateFrom = &parsed
	}

	if query.DateTo != "" {
		parsed, err := time.Parse("2006-01-02", query.DateTo)
		if err != nil {
			response.BadRequest(c, "Invalid date_to format, use YYYY-MM-DD")
			return
		}
		dateTo = &parsed
	}

	showtimes, total, err := h.biz.GetShowtimes(c.Request.Context(), query.Page, query.Size, query.Search, query.MovieId, query.RoomId, query.Format, query.Status, dateFrom, dateTo, query.ExcludeEnded)
	if err != nil {
		response.ErrorWithMessage(c, "Failed to get showtimes")
		return
	}

	resp := entity.ToShowtimesResponse(showtimes, query.Page, query.Size, total)
	response.Success(c, resp)
}

func (h *handler) GetShowtimeById(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		response.BadRequest(c, "Showtime ID is required")
		return
	}

	showtime, err := h.biz.GetShowtimeById(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, business.ErrShowtimeNotFound) {
			response.NotFound(c, fmt.Errorf("showtime not found"))
			return
		}

		response.ErrorWithMessage(c, "Failed to get showtime")
		return
	}

	resp := entity.ToShowtimeBookingResponse(showtime)
	response.Success(c, resp)
}

func (h *handler) GetUpcomingShowtimes(c *gin.Context) {
	limit := 10
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsed, err := time.Parse("2006-01-02", limitStr); err == nil {
			limit = int(parsed.Unix())
		}
	}

	showtimes, err := h.biz.GetUpcomingShowtimes(c.Request.Context(), limit)
	if err != nil {
		response.ErrorWithMessage(c, "Failed to get upcoming showtimes")
		return
	}

	responses := make([]*entity.ShowtimeResponse, len(showtimes))
	for i, showtime := range showtimes {
		responses[i] = entity.ToShowtimeResponse(showtime)
	}

	response.Success(c, map[string]interface{}{
		"data": responses,
	})
}

func (h *handler) CreateShowtime(c *gin.Context) {
	var req entity.CreateShowtimeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, fmt.Sprintf("Invalid request body: %s", err.Error()))
		return
	}

	if !req.IsValid() {
		response.BadRequest(c, "Invalid showtime data")
		return
	}

	showtime := req.ToShowtime()
	if err := h.biz.CreateShowtime(c.Request.Context(), showtime); err != nil {
		if errors.Is(err, business.ErrTimeConflict) {
			response.BadRequest(c, "Showtime conflicts with existing schedule")
			return
		}
		if errors.Is(err, business.ErrShowtimeInPast) {
			response.BadRequest(c, "Cannot schedule showtime in the past")
			return
		}

		response.ErrorWithMessage(c, "Failed to create showtime")
		return
	}

	resp := entity.ToShowtimeResponse(showtime)
	response.Created(c, resp)
}

func (h *handler) UpdateShowtime(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		response.BadRequest(c, "Showtime ID is required")
		return
	}

	var req entity.UpdateShowtimeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, fmt.Sprintf("Invalid request body: %s", err.Error()))
		return
	}

	if err := h.biz.UpdateShowtime(c.Request.Context(), id, &req); err != nil {
		if errors.Is(err, business.ErrShowtimeNotFound) {
			response.NotFound(c, fmt.Errorf("showtime not found"))
			return
		}
		if errors.Is(err, business.ErrTimeConflict) {
			response.BadRequest(c, "Showtime conflicts with existing schedule")
			return
		}
		if errors.Is(err, business.ErrInvalidStatusTransition) {
			response.BadRequest(c, "Invalid status transition")
			return
		}
		if errors.Is(err, business.ErrShowtimeInPast) {
			response.BadRequest(c, "Cannot schedule showtime in the past")
			return
		}

		response.ErrorWithMessage(c, "Failed to update showtime")
		return
	}

	showtime, err := h.biz.GetShowtimeById(c.Request.Context(), id)
	if err != nil {
		response.ErrorWithMessage(c, "Failed to get updated showtime")
		return
	}

	resp := entity.ToShowtimeResponse(showtime)
	response.Success(c, resp)
}

func (h *handler) DeleteShowtime(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		response.BadRequest(c, "Showtime ID is required")
		return
	}

	if err := h.biz.DeleteShowtime(c.Request.Context(), id); err != nil {
		response.ErrorWithMessage(c, "Failed to delete showtime")
		return
	}

	response.NoContent(c)
}

func (h *handler) UpdateShowtimeStatus(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		response.BadRequest(c, "Showtime ID is required")
		return
	}

	var req struct {
		Status entity.ShowtimeStatus `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, fmt.Sprintf("Invalid request body: %s", err.Error()))
		return
	}

	if err := h.biz.UpdateShowtimeStatus(c.Request.Context(), id, req.Status); err != nil {
		if errors.Is(err, business.ErrShowtimeNotFound) {
			response.NotFound(c, fmt.Errorf("showtime not found"))
			return
		}
		if errors.Is(err, business.ErrInvalidStatusTransition) {
			response.BadRequest(c, "Invalid status transition")
			return
		}

		response.ErrorWithMessage(c, "Failed to update showtime status")
		return
	}

	showtime, err := h.biz.GetShowtimeById(c.Request.Context(), id)
	if err != nil {
		response.ErrorWithMessage(c, "Failed to get updated showtime")
		return
	}

	resp := entity.ToShowtimeResponse(showtime)
	response.Success(c, resp)
}
