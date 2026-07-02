package entity

import (
	"time"

	"movie-service/internal/pkg/paging"
)

type CreateShowtimeRequest struct {
	MovieId   string         `json:"movie_id" binding:"required"`
	RoomId    string         `json:"room_id" binding:"required"`
	StartTime time.Time      `json:"start_time" binding:"required"`
	EndTime   time.Time      `json:"end_time" binding:"required"`
	Format    ShowtimeFormat `json:"format" binding:"required"`
	BasePrice float64        `json:"base_price" binding:"required,min=0"`
}

type UpdateShowtimeRequest struct {
	MovieId   *string         `json:"movie_id,omitempty"`
	RoomId    *string         `json:"room_id,omitempty"`
	StartTime *time.Time      `json:"start_time,omitempty"`
	EndTime   *time.Time      `json:"end_time,omitempty"`
	Format    *ShowtimeFormat `json:"format,omitempty"`
	BasePrice *float64        `json:"base_price,omitempty" binding:"omitempty,min=0"`
	Status    *ShowtimeStatus `json:"status,omitempty"`
}

type GetShowtimesQuery struct {
	Page         int            `form:"page,default=1" binding:"min=1"`
	Size         int            `form:"size,default=10" binding:"min=1,max=1000"`
	Search       string         `form:"search"`
	MovieId      string         `form:"movie_id"`
	RoomId       string         `form:"room_id"`
	Format       ShowtimeFormat `form:"format"`
	Status       ShowtimeStatus `form:"status"`
	DateFrom     string         `form:"date_from"`
	DateTo       string         `form:"date_to"`
	ExcludeEnded bool           `form:"exclude_ended"`
}

type ShowtimeResponse struct {
	Id        string         `json:"id"`
	MovieId   string         `json:"movie_id"`
	RoomId    string         `json:"room_id"`
	StartTime string         `json:"start_time"`
	EndTime   string         `json:"end_time"`
	Format    ShowtimeFormat `json:"format"`
	BasePrice float64        `json:"base_price"`
	Status    ShowtimeStatus `json:"status"`
	Duration  string         `json:"duration"`
	CreatedAt string         `json:"created_at"`
	UpdatedAt *string        `json:"updated_at,omitempty"`
	Movie     *Movie         `json:"movie,omitempty"`
	Room      *Room          `json:"room,omitempty"`
}

type ShowtimesResponse struct {
	Data   []*ShowtimeResponse `json:"data"`
	Paging *paging.PageInfo    `json:"paging"`
}

type ShowtimeWithDetailsResponse struct {
	Id         string         `json:"id"`
	MovieId    string         `json:"movie_id"`
	MovieName  string         `json:"movie_name,omitempty"`
	RoomId     string         `json:"room_id"`
	RoomNumber int            `json:"room_number,omitempty"`
	StartTime  string         `json:"start_time"`
	EndTime    string         `json:"end_time"`
	Format     ShowtimeFormat `json:"format"`
	BasePrice  float64        `json:"base_price"`
	Status     ShowtimeStatus `json:"status"`
	Duration   string         `json:"duration"`
	CreatedAt  string         `json:"created_at"`
	UpdatedAt  *string        `json:"updated_at,omitempty"`
}

type ShowtimeBookingResponse struct {
	Id        string         `json:"id"`
	StartTime string         `json:"start_time"`
	EndTime   string         `json:"end_time"`
	Format    ShowtimeFormat `json:"format"`
	BasePrice float64        `json:"base_price"`
	Status    ShowtimeStatus `json:"status"`
	Duration  string         `json:"duration"`
	CreatedAt string         `json:"created_at"`
	Movie     *Movie         `json:"movie"`
	Room      *Room          `json:"room"`
	Seats     []*Seat        `json:"seats"`
}

func ToShowtimeBookingResponse(showtime *Showtime) *ShowtimeBookingResponse {
	if showtime == nil {
		return nil
	}

	return &ShowtimeBookingResponse{
		Id:        showtime.Id,
		StartTime: showtime.StartTime.Format("2006-01-02T15:04:05Z07:00"),
		EndTime:   showtime.EndTime.Format("2006-01-02T15:04:05Z07:00"),
		Format:    showtime.Format,
		BasePrice: showtime.BasePrice,
		Status:    showtime.Status,
		Duration:  showtime.CalculateDuration().String(),
		CreatedAt: showtime.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		Movie:     showtime.Movie,
		Room:      showtime.Room,
		Seats:     showtime.Seats,
	}
}

func ToShowtimeResponse(showtime *Showtime) *ShowtimeResponse {
	if showtime == nil {
		return nil
	}

	resp := &ShowtimeResponse{
		Id:        showtime.Id,
		MovieId:   showtime.MovieId,
		RoomId:    showtime.RoomId,
		StartTime: showtime.StartTime.Format("2006-01-02T15:04:05Z07:00"),
		EndTime:   showtime.EndTime.Format("2006-01-02T15:04:05Z07:00"),
		Format:    showtime.Format,
		BasePrice: showtime.BasePrice,
		Status:    showtime.Status,
		Duration:  showtime.CalculateDuration().String(),
		CreatedAt: showtime.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		Movie:     showtime.Movie,
		Room:      showtime.Room,
	}

	if showtime.UpdatedAt != nil {
		updatedAt := showtime.UpdatedAt.Format("2006-01-02T15:04:05Z07:00")
		resp.UpdatedAt = &updatedAt
	}

	return resp
}

func ToShowtimesResponse(showtimes []*Showtime, page, size, total int) *ShowtimesResponse {
	data := make([]*ShowtimeResponse, len(showtimes))
	for i, showtime := range showtimes {
		data[i] = ToShowtimeResponse(showtime)
	}

	return &ShowtimesResponse{
		Data:   data,
		Paging: paging.NewPageInfo(page, size, total),
	}
}

func (req *CreateShowtimeRequest) ToShowtime() *Showtime {
	startTime := TruncateToHalfHour(req.StartTime)
	endTime := TruncateToHalfHour(req.EndTime)

	if endTime.Before(startTime) || endTime.Equal(startTime) {
		endTime = startTime.Add(time.Hour * 2)
	}

	return &Showtime{
		MovieId:   req.MovieId,
		RoomId:    req.RoomId,
		StartTime: startTime,
		EndTime:   endTime,
		Format:    req.Format,
		BasePrice: req.BasePrice,
		Status:    ShowtimeStatusScheduled,
	}
}

func (req *CreateShowtimeRequest) IsValid() bool {
	if req.MovieId == "" || req.RoomId == "" {
		return false
	}
	if req.BasePrice < 0 {
		return false
	}
	if req.EndTime.Before(req.StartTime) || req.EndTime.Equal(req.StartTime) {
		return false
	}
	return true
}
