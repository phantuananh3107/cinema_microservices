package entity

import "movie-service/internal/pkg/paging"

type CreateSeatRequest struct {
	RoomId     string   `json:"room_id" binding:"required"`
	SeatNumber string   `json:"seat_number" binding:"required"`
	RowNumber  string   `json:"row_number" binding:"required"`
	SeatType   SeatType `json:"seat_type" binding:"required"`
}

type UpdateSeatRequest struct {
	SeatNumber *string     `json:"seat_number,omitempty"`
	RowNumber  *string     `json:"row_number,omitempty"`
	SeatType   *SeatType   `json:"seat_type,omitempty"`
	Status     *SeatStatus `json:"status,omitempty"`
}

type GetSeatsQuery struct {
	Page      int        `form:"page,default=1" binding:"min=1"`
	Size      int        `form:"size,default=10" binding:"min=1,max=500"`
	Search    string     `form:"search"`
	RoomId    string     `form:"room_id"`
	SeatType  SeatType   `form:"seat_type"`
	Status    SeatStatus `form:"status"`
	RowNumber string     `form:"row_number"`
}

type SeatResponse struct {
	Id         string     `json:"id"`
	RoomId     string     `json:"room_id"`
	SeatNumber string     `json:"seat_number"`
	RowNumber  string     `json:"row_number"`
	SeatType   SeatType   `json:"seat_type"`
	Status     SeatStatus `json:"status"`
	CreatedAt  string     `json:"created_at"`
	UpdatedAt  *string    `json:"updated_at,omitempty"`
}

type SeatsResponse struct {
	Data   []*SeatResponse  `json:"data"`
	Paging *paging.PageInfo `json:"paging"`
}

func ToSeatResponse(seat *Seat) *SeatResponse {
	if seat == nil {
		return nil
	}

	resp := &SeatResponse{
		Id:         seat.Id,
		RoomId:     seat.RoomId,
		SeatNumber: seat.SeatNumber,
		RowNumber:  seat.RowNumber,
		SeatType:   seat.SeatType,
		Status:     seat.Status,
		CreatedAt:  seat.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	if seat.UpdatedAt != nil {
		updatedAt := seat.UpdatedAt.Format("2006-01-02T15:04:05Z07:00")
		resp.UpdatedAt = &updatedAt
	}

	return resp
}

func ToSeatsResponse(seats []*Seat, page, size, total int) *SeatsResponse {
	data := make([]*SeatResponse, len(seats))
	for i, seat := range seats {
		data[i] = ToSeatResponse(seat)
	}

	return &SeatsResponse{
		Data:   data,
		Paging: paging.NewPageInfo(page, size, total),
	}
}

type LockedSeatsResponse struct {
	LockedSeatIds []string `json:"locked_seat_ids"`
	BookedSeatIds []string `json:"booked_seat_ids"`
}

func (req *CreateSeatRequest) ToSeat() *Seat {
	return &Seat{
		RoomId:     req.RoomId,
		SeatNumber: req.SeatNumber,
		RowNumber:  req.RowNumber,
		SeatType:   req.SeatType,
		Status:     SeatStatusAvailable,
	}
}
