package transport

import (
	"net/http"
	"strconv"

	"movie-service/internal/module/news/business"

	"github.com/labstack/echo/v4"
)

type HTTPHandler struct {
	biz business.NewsBusiness
}

func NewHTTPHandler(biz business.NewsBusiness) *HTTPHandler {
	return &HTTPHandler{biz: biz}
}

func (h *HTTPHandler) GetNewsSummaries(c echo.Context) error {
	category := c.QueryParam("category")
	if category == "" {
		category = "all"
	}

	page, err := strconv.Atoi(c.QueryParam("page"))
	if err != nil || page < 1 {
		page = 1
	}

	pageSize, err := strconv.Atoi(c.QueryParam("page_size"))
	if err != nil || pageSize < 1 || pageSize > 50 {
		pageSize = 10
	}

	summaries, total, err := h.biz.GetNewsSummaries(c.Request().Context(), category, page, pageSize, false)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"error": "Failed to fetch news summaries",
		})
	}

	totalPages := (total + pageSize - 1) / pageSize

	return c.JSON(http.StatusOK, map[string]interface{}{
		"data": summaries,
		"pagination": map[string]interface{}{
			"current_page": page,
			"page_size":    pageSize,
			"total":        total,
			"total_pages":  totalPages,
		},
	})
}

func (h *HTTPHandler) GetNewsSummaryByID(c echo.Context) error {
	id := c.Param("id")

	summary, err := h.biz.GetNewsSummaryByID(c.Request().Context(), id)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]interface{}{
			"error": "News summary not found",
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"data": summary,
	})
}

func (h *HTTPHandler) RegisterRoutes(g *echo.Group) {
	news := g.Group("/news")
	{
		news.GET("/summaries", h.GetNewsSummaries)
		news.GET("/summaries/:id", h.GetNewsSummaryByID)
	}
}
