package rest

import (
	"errors"
	"fmt"
	"strings"

	"movie-service/internal/module/room/business"
	"movie-service/internal/module/room/entity"
	"movie-service/internal/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/samber/do"
)

type handler struct {
	biz business.RoomBiz
}

func NewAPI(i *do.Injector) (*handler, error) {
	biz, err := do.Invoke[business.RoomBiz](i)
	if err != nil {
		return nil, err
	}

	return &handler{
		biz: biz,
	}, nil
}

func (h *handler) GetRooms(c *gin.Context) {
	var query entity.GetRoomsQuery
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

	query.RoomType = entity.RoomType(strings.ToUpper(string(query.RoomType)))
	query.Status = entity.RoomStatus(strings.ToUpper(string(query.Status)))

	rooms, total, err := h.biz.GetRooms(c.Request.Context(), query.Page, query.Size, query.Search, query.RoomType, query.Status)
	if err != nil {
		response.ErrorWithMessage(c, "Failed to get rooms")
		return
	}

	resp := entity.ToRoomsResponse(rooms, query.Page, query.Size, total)
	response.Success(c, resp)
}

func (h *handler) GetRoomById(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		response.BadRequest(c, "Room ID is required")
		return
	}

	room, err := h.biz.GetRoomById(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, business.ErrRoomNotFound) {
			response.NotFound(c, fmt.Errorf("room not found"))
			return
		}

		response.ErrorWithMessage(c, "Failed to get room")
		return
	}

	resp := entity.ToRoomResponse(room)
	response.Success(c, resp)
}

func (h *handler) CreateRoom(c *gin.Context) {
	var req entity.CreateRoomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, fmt.Sprintf("Invalid request body: %s", err.Error()))
		return
	}

	room := req.ToRoom()
	if err := h.biz.CreateRoom(c.Request.Context(), room); err != nil {
		if errors.Is(err, business.ErrRoomNumberExists) {
			response.BadRequest(c, "Room number already exists")
			return
		}

		response.ErrorWithMessage(c, "Failed to create room")
		return
	}

	resp := entity.ToRoomResponse(room)
	response.Created(c, resp)
}

func (h *handler) UpdateRoom(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		response.BadRequest(c, "Room ID is required")
		return
	}

	var req entity.UpdateRoomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, fmt.Sprintf("Invalid request body: %s", err.Error()))
		return
	}

	if err := h.biz.UpdateRoom(c.Request.Context(), id, &req); err != nil {
		if errors.Is(err, business.ErrRoomNotFound) {
			response.NotFound(c, fmt.Errorf("room not found"))
			return
		}
		if errors.Is(err, business.ErrRoomNumberExists) {
			response.BadRequest(c, "Room number already exists")
			return
		}
		if errors.Is(err, business.ErrInvalidStatusTransition) {
			response.BadRequest(c, "Invalid status transition")
			return
		}

		response.ErrorWithMessage(c, "Failed to update room")
		return
	}

	room, err := h.biz.GetRoomById(c.Request.Context(), id)
	if err != nil {
		response.ErrorWithMessage(c, "Failed to get updated room")
		return
	}

	resp := entity.ToRoomResponse(room)
	response.Success(c, resp)
}

func (h *handler) DeleteRoom(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		response.BadRequest(c, "Room ID is required")
		return
	}

	if err := h.biz.DeleteRoom(c.Request.Context(), id); err != nil {
		response.ErrorWithMessage(c, "Failed to delete room")
		return
	}

	response.NoContent(c)
}

func (h *handler) UpdateRoomStatus(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		response.BadRequest(c, "Room ID is required")
		return
	}

	var req struct {
		Status entity.RoomStatus `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, fmt.Sprintf("Invalid request body: %s", err.Error()))
		return
	}

	if err := h.biz.UpdateRoomStatus(c.Request.Context(), id, req.Status); err != nil {
		if errors.Is(err, business.ErrRoomNotFound) {
			response.NotFound(c, fmt.Errorf("room not found"))
			return
		}
		if errors.Is(err, business.ErrInvalidStatusTransition) {
			response.BadRequest(c, "Invalid status transition")
			return
		}

		response.ErrorWithMessage(c, "Failed to update room status")
		return
	}

	room, err := h.biz.GetRoomById(c.Request.Context(), id)
	if err != nil {
		response.ErrorWithMessage(c, "Failed to get updated room")
		return
	}

	resp := entity.ToRoomResponse(room)
	response.Success(c, resp)
}
