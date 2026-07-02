package paging

import (
	"strconv"

	"github.com/labstack/echo/v4"
)

const (
	defaultQueryPage     = "1"
	defaultQueryPageSize = "10"
)

type Paging struct {
	Limit  int
	Offset int
}

type PageInfo struct {
	Page       int `json:"page"`
	Size       int `json:"size"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

func GetQueryPaging(c echo.Context) *Paging {
	page := stringToInt(c.QueryParam("page"))
	if page <= 0 {
		page = stringToInt(defaultQueryPage)
	}

	size := stringToInt(c.QueryParam("size"))
	if size <= 0 {
		size = stringToInt(defaultQueryPageSize)
	}

	// Limit maximum page size to prevent abuse
	if size > 100 {
		size = 100
	}

	return &Paging{
		Limit:  size,
		Offset: (page - 1) * size,
	}
}

func NewPageInfo(page, size, total int) *PageInfo {
	totalPages := total / size
	if total%size > 0 {
		totalPages++
	}
	return &PageInfo{
		Page:       page,
		Size:       size,
		Total:      total,
		TotalPages: totalPages,
	}
}

func stringToInt(s string) int {
	i, err := strconv.Atoi(s)
	if err != nil {
		return 0
	}
	return i
}
