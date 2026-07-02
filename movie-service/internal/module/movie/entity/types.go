package entity

import "time"

// Request DTOs
type CreateMovieRequest struct {
	Title       string     `json:"title" binding:"required,min=1,max=255"`
	Director    string     `json:"director,omitempty"`
	Cast        string     `json:"cast,omitempty"`
	Genres      []string   `json:"genres,omitempty"`
	Duration    int        `json:"duration" binding:"required,min=1"`
	ReleaseDate *time.Time `json:"release_date,omitempty"`
	Description string     `json:"description,omitempty"`
	TrailerURL  string     `json:"trailer_url,omitempty"`
	PosterURL   string     `json:"poster_url,omitempty"`
	Status      string     `json:"status,omitempty"`
}

type UpdateMovieRequest struct {
	Title       string     `json:"title" binding:"required,min=1,max=255"`
	Director    string     `json:"director,omitempty"`
	Cast        string     `json:"cast,omitempty"`
	Genres      []string   `json:"genres,omitempty"`
	Duration    int        `json:"duration" binding:"required,min=1"`
	ReleaseDate *time.Time `json:"release_date,omitempty"`
	Description string     `json:"description,omitempty"`
	TrailerURL  string     `json:"trailer_url,omitempty"`
	PosterURL   string     `json:"poster_url,omitempty"`
	Status      string     `json:"status,omitempty"`
}

type UpdateMovieStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=upcoming showing ended UPCOMING SHOWING ENDED"`
}

type GetMoviesQuery struct {
	Page   int    `form:"page,default=1" binding:"min=1"`
	Size   int    `form:"size,default=10" binding:"min=1,max=100"`
	Search string `form:"search"`
	Status string `form:"status" binding:"omitempty,oneof=upcoming showing ended UPCOMING SHOWING ENDED"`
}

type MovieResponse struct {
	Id          string     `json:"id"`
	Title       string     `json:"title"`
	Director    string     `json:"director,omitempty"`
	Cast        string     `json:"cast,omitempty"`
	Genres      []string   `json:"genres,omitempty"`
	Duration    int        `json:"duration"`
	ReleaseDate *time.Time `json:"release_date,omitempty"`
	Description string     `json:"description,omitempty"`
	TrailerURL  string     `json:"trailer_url,omitempty"`
	PosterURL   string     `json:"poster_url,omitempty"`
	Status      string     `json:"status"`
	CreatedAt   *time.Time `json:"created_at"`
	UpdatedAt   *time.Time `json:"updated_at,omitempty"`
}

type GetMoviesResponse struct {
	Movies []*MovieResponse `json:"movies"`
	Meta   *MetaResponse    `json:"meta"`
	Hello  string           `json:"hello""`
}

type MetaResponse struct {
	Page       int `json:"page"`
	Size       int `json:"size"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

// Helper functions to convert between DTOs and entities
func (r *CreateMovieRequest) ToEntity() *Movie {
	movie := &Movie{
		Title:       r.Title,
		Director:    r.Director,
		Cast:        r.Cast,
		Duration:    r.Duration,
		ReleaseDate: r.ReleaseDate,
		Description: r.Description,
		TrailerURL:  r.TrailerURL,
		PosterURL:   r.PosterURL,
	}

	movie.Status = MovieStatusUpcoming
	if r.Status != "" {
		movie.Status = MovieStatus(r.Status)
	}

	return movie
}

func (r *UpdateMovieRequest) ToEntity(id string) *Movie {
	movie := &Movie{
		Id:          id,
		Title:       r.Title,
		Director:    r.Director,
		Cast:        r.Cast,
		Duration:    r.Duration,
		ReleaseDate: r.ReleaseDate,
		Description: r.Description,
		TrailerURL:  r.TrailerURL,
		PosterURL:   r.PosterURL,
	}

	if r.Status != "" {
		movie.Status = MovieStatus(r.Status)
	}

	return movie
}

func ToMovieResponse(movie *Movie) *MovieResponse {
	genres := make([]string, len(movie.MovieGenres))
	for i, genre := range movie.MovieGenres {
		genres[i] = genre.Genre.Name
	}

	return &MovieResponse{
		Id:          movie.Id,
		Title:       movie.Title,
		Director:    movie.Director,
		Cast:        movie.Cast,
		Genres:      genres,
		Duration:    movie.Duration,
		ReleaseDate: movie.ReleaseDate,
		Description: movie.Description,
		TrailerURL:  movie.TrailerURL,
		PosterURL:   movie.PosterURL,
		Status:      string(movie.Status),
		CreatedAt:   movie.CreatedAt,
		UpdatedAt:   movie.UpdatedAt,
	}
}

func ToMoviesResponse(movies []*Movie, page, size, total int) *GetMoviesResponse {
	movieResponses := make([]*MovieResponse, len(movies))
	for i, movie := range movies {
		movieResponses[i] = ToMovieResponse(movie)
	}

	totalPages := (total + size - 1) / size // Ceiling division
	if totalPages == 0 {
		totalPages = 1
	}

	return &GetMoviesResponse{
		Movies: movieResponses,
		Meta: &MetaResponse{
			Page:       page,
			Size:       size,
			Total:      total,
			TotalPages: totalPages,
		},
		Hello: "world_ok!",
	}
}

type MovieStat struct {
	Status string `bun:"status"`
	Count  int64  `bun:"count"`
}
