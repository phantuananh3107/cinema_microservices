package entity

import "movie-service/internal/pkg/paging"

type CreateRoomRequest struct {
	RoomNumber int      `json:"room_number" binding:"required,min=1"`
	Capacity   int      `json:"capacity" binding:"required,min=1"`
	RoomType   RoomType `json:"room_type" binding:"required"`
}

type UpdateRoomRequest struct {
	RoomNumber *int        `json:"room_number,omitempty" binding:"omitempty,min=1"`
	Capacity   *int        `json:"capacity,omitempty" binding:"omitempty,min=1"`
	RoomType   *RoomType   `json:"room_type,omitempty"`
	Status     *RoomStatus `json:"status,omitempty"`
}

type GetRoomsQuery struct {
	Page     int        `form:"page,default=1" binding:"min=1"`
	Size     int        `form:"size,default=10" binding:"min=1,max=100"`
	Search   string     `form:"search"`
	RoomType RoomType   `form:"room_type"`
	Status   RoomStatus `form:"status"`
}

type RoomResponse struct {
	Id         string     `json:"id"`
	RoomNumber int        `json:"room_number"`
	Capacity   int        `json:"capacity"`
	RoomType   RoomType   `json:"room_type"`
	Status     RoomStatus `json:"status"`
	CreatedAt  string     `json:"created_at"`
	UpdatedAt  *string    `json:"updated_at,omitempty"`
}

type RoomsResponse struct {
	Data   []*RoomResponse  `json:"data"`
	Paging *paging.PageInfo `json:"paging"`
}

func ToRoomResponse(room *Room) *RoomResponse {
	if room == nil {
		return nil
	}

	resp := &RoomResponse{
		Id:         room.Id,
		RoomNumber: room.RoomNumber,
		Capacity:   room.Capacity,
		RoomType:   room.RoomType,
		Status:     room.Status,
		CreatedAt:  room.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	if room.UpdatedAt != nil {
		updatedAt := room.UpdatedAt.Format("2006-01-02T15:04:05Z07:00")
		resp.UpdatedAt = &updatedAt
	}

	return resp
}

func ToRoomsResponse(rooms []*Room, page, size, total int) *RoomsResponse {
	data := make([]*RoomResponse, len(rooms))
	for i, room := range rooms {
		data[i] = ToRoomResponse(room)
	}

	return &RoomsResponse{
		Data:   data,
		Paging: paging.NewPageInfo(page, size, total),
	}
}

func (req *CreateRoomRequest) ToRoom() *Room {
	return &Room{
		RoomNumber: req.RoomNumber,
		Capacity:   req.Capacity,
		RoomType:   req.RoomType,
		Status:     RoomStatusActive,
	}
}
