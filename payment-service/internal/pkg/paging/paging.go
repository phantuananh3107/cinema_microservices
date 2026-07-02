package paging

import (
	"strconv"

	"github.com/gin-gonic/gin"
)

const (
	defaultQueryPage     = "1"
	defaultQueryPageSize = "5"
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

func GetQueryPaging(c *gin.Context) *Paging {
	page := stringToInt(c.DefaultQuery("page", defaultQueryPage))
	size := stringToInt(c.DefaultQuery("size", defaultQueryPageSize))
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
