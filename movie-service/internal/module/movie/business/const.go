package business

import (
	"fmt"
	"time"

	"movie-service/internal/pkg/paging"
)

const (
	keyPagingListMovie        = "v1_paging_movie_%d_%d_%s_%s" // v1_paging_movie_<limit>_<offset>_<search>_<status>
	keyPagingListMoviePattern = "v1_paging_movie_*"

	keyMovieDetail        = "v1_movie_detail_%s" // v1_movie_<movie_id>
	keyMovieDetailPattern = "v1_movie_detail_*"

	keyTotalMovieCount        = "v1_total_movie_count_%s_%s" // v1_total_movie_count_<search>_<status>
	keyTotalMovieCountPattern = "v1_total_movie_count_*"

	keyMovieStats = "v1_movie_stats"

	CACHE_TTL_5_SEC   = 5 * time.Second
	CACHE_TTL_15_SEC  = 15 * time.Second
	CACHE_TTL_1_MIN   = 1 * time.Minute
	CACHE_TTL_5_MINS  = 5 * time.Minute
	CACHE_TTL_15_MINS = 15 * time.Minute
	CACHE_TTL_30_MINS = 30 * time.Minute
	CACHE_TTL_1_HOUR  = 1 * time.Hour
	CACHE_TTL_6_HOUR  = 6 * time.Hour
	CACHE_TTL_12_HOUR = 12 * time.Hour
	CACHE_TTL_1_DAY   = 24 * time.Hour
)

func redisPagingListMovie(paging *paging.Paging, search string, status string) string {
	return fmt.Sprintf(keyPagingListMovie, paging.Limit, paging.Offset, search, status)
}

func redisMovieDetail(movieId string) string {
	return fmt.Sprintf(keyMovieDetail, movieId)
}

func redisTotalMovieCount(search string, status string) string {
	return fmt.Sprintf(keyTotalMovieCount, search, status)
}
