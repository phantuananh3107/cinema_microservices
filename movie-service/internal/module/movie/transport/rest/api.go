package rest

import (
	"errors"
	"fmt"
	"strings"

	"movie-service/internal/module/movie/business"
	"movie-service/internal/module/movie/entity"
	"movie-service/internal/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/samber/do"
)

type handler struct {
	biz business.MovieBiz
}

func NewAPI(i *do.Injector) (*handler, error) {
	biz, err := do.Invoke[business.MovieBiz](i)
	if err != nil {
		return nil, err
	}

	return &handler{
		biz: biz,
	}, nil
}

func (h *handler) GetMovies(c *gin.Context) {
	var query entity.GetMoviesQuery
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

	query.Status = strings.ToUpper(query.Status)

	movies, total, err := h.biz.GetMovies(c.Request.Context(), query.Page, query.Size, query.Search, query.Status)
	if err != nil {
		response.ErrorWithMessage(c, err.Error())
		return
	}

	resp := entity.ToMoviesResponse(movies, query.Page, query.Size, total)
	response.Success(c, resp)
}

func (h *handler) GetMovieById(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		response.BadRequest(c, "Movie ID is required")
		return
	}

	movie, err := h.biz.GetMovieById(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, business.ErrMovieNotFound) {
			response.NotFound(c, fmt.Errorf("movie not found"))
			return
		}

		response.ErrorWithMessage(c, err.Error())
		return
	}

	resp := entity.ToMovieResponse(movie)
	response.Success(c, resp)
}

func (h *handler) CreateMovie(c *gin.Context) {
	var req entity.CreateMovieRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, fmt.Sprintf("Invalid request body: %s", err.Error()))
		return
	}

	movie := req.ToEntity()
	if err := h.biz.CreateMovie(c.Request.Context(), movie, req.Genres); err != nil {
		if errors.Is(err, business.ErrInvalidMovieData) {
			response.BadRequest(c, "Invalid movie data")
			return
		}

		response.ErrorWithMessage(c, err.Error())
		return
	}

	resp := entity.ToMovieResponse(movie)
	response.Created(c, resp)
}

func (h *handler) UpdateMovie(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		response.BadRequest(c, "Movie ID is required")
		return
	}

	var req entity.UpdateMovieRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, fmt.Sprintf("Invalid request body: %s", err.Error()))
		return
	}

	movie := req.ToEntity(id)
	if err := h.biz.UpdateMovie(c.Request.Context(), movie, req.Genres); err != nil {
		if errors.Is(err, business.ErrMovieNotFound) {
			response.NotFound(c, fmt.Errorf("movie not found"))
			return
		}
		if errors.Is(err, business.ErrInvalidMovieData) {
			response.BadRequest(c, "Invalid movie data")
			return
		}

		response.ErrorWithMessage(c, err.Error())
		return
	}

	updatedMovie, err := h.biz.GetMovieById(c.Request.Context(), id)
	if err != nil {
		response.ErrorWithMessage(c, err.Error())
		return
	}

	resp := entity.ToMovieResponse(updatedMovie)
	response.Success(c, resp)
}

func (h *handler) DeleteMovie(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		response.BadRequest(c, "Movie ID is required")
		return
	}

	if err := h.biz.DeleteMovie(c.Request.Context(), id); err != nil {
		if errors.Is(err, business.ErrMovieNotFound) {
			response.NotFound(c, fmt.Errorf("movie not found"))
			return
		}

		response.ErrorWithMessage(c, err.Error())
		return
	}

	response.NoContent(c)
}

func (h *handler) UpdateMovieStatus(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		response.BadRequest(c, "Movie ID is required")
		return
	}

	var req entity.UpdateMovieStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, fmt.Sprintf("Invalid request body: %s", err.Error()))
		return
	}

	if err := h.biz.UpdateMovieStatus(c.Request.Context(), id, entity.MovieStatus(req.Status)); err != nil {
		if errors.Is(err, business.ErrMovieNotFound) {
			response.NotFound(c, fmt.Errorf("movie not found"))
			return
		}
		if errors.Is(err, business.ErrInvalidMovieData) {
			response.BadRequest(c, "Invalid movie status")
			return
		}

		response.ErrorWithMessage(c, err.Error())
		return
	}

	movie, err := h.biz.GetMovieById(c.Request.Context(), id)
	if err != nil {
		response.ErrorWithMessage(c, err.Error())
		return
	}

	resp := entity.ToMovieResponse(movie)
	response.Success(c, resp)
}

func (h *handler) GetMovieStats(c *gin.Context) {
	stats, err := h.biz.GetMovieStats(c.Request.Context())
	if err != nil {
		response.ErrorWithMessage(c, err.Error())
		return
	}

	response.Success(c, stats)
}

func (h *handler) GetGenres(c *gin.Context) {
	genres, err := h.biz.GetGenres(c.Request.Context())
	if err != nil {
		response.ErrorWithMessage(c, err.Error())
		return
	}

	genreResponses := make([]map[string]interface{}, len(genres))
	for i, genre := range genres {
		genreResponses[i] = map[string]interface{}{
			"id":   genre.Id,
			"name": genre.Name,
		}
	}

	response.Success(c, genreResponses)
}
