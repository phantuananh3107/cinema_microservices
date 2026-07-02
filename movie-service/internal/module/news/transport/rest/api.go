package rest

import (
	"net/http"
	"strconv"

	"movie-service/internal/module/news/business"
	"movie-service/internal/module/news/repository"

	"github.com/gin-gonic/gin"
	"github.com/samber/do"
	"github.com/uptrace/bun"
)

type API struct {
	biz business.NewsBusiness
}

func NewAPI(i *do.Injector) (*API, error) {
	db, err := do.Invoke[*bun.DB](i)
	if err != nil {
		return nil, err
	}

	repo := repository.NewNewsRepository(db)
	biz := business.NewNewsBusiness(repo)

	return &API{biz: biz}, nil
}

func (a *API) GetNewsSummaries(c *gin.Context) {
	a.getNewsSummaries(c, false)
}

func (a *API) GetAllNewsSummaries(c *gin.Context) {
	a.getNewsSummaries(c, true)
}

func (a *API) getNewsSummaries(c *gin.Context, includeInactive bool) {
	category := c.DefaultQuery("category", "all")

	page, err := strconv.Atoi(c.DefaultQuery("page", "1"))
	if err != nil || page < 1 {
		page = 1
	}

	pageSize, err := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	if err != nil || pageSize < 1 || pageSize > 50 {
		pageSize = 10
	}

	summaries, total, err := a.biz.GetNewsSummaries(c.Request.Context(), category, page, pageSize, includeInactive)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch news summaries",
		})
		return
	}

	totalPages := (total + pageSize - 1) / pageSize

	c.JSON(http.StatusOK, gin.H{
		"data": summaries,
		"pagination": gin.H{
			"current_page": page,
			"page_size":    pageSize,
			"total":        total,
			"total_pages":  totalPages,
		},
	})
}

func (a *API) GetNewsSummaryByID(c *gin.Context) {
	id := c.Param("id")

	summary, err := a.biz.GetNewsSummaryByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "News summary not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": summary,
	})
}

func (a *API) UpdateNewsSummary(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		Title   string `json:"title" binding:"required"`
		Summary string `json:"summary" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
		})
		return
	}

	err := a.biz.UpdateNewsSummary(c.Request.Context(), id, req.Title, req.Summary)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update news",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "News updated successfully",
	})
}

func (a *API) ToggleNewsSummaryActive(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		IsActive bool `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
		})
		return
	}

	err := a.biz.ToggleNewsSummaryActive(c.Request.Context(), id, req.IsActive)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update news status",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "News status updated successfully",
	})
}
