package business

import (
	"fmt"
	"time"
)

const (
	CACHE_TTL_1_HOUR  = time.Hour
	CACHE_TTL_30_MINS = 30 * time.Minute
	CACHE_TTL_5_MINS  = 5 * time.Minute
)

func redisShowtimeDetail(id string) string {
	return fmt.Sprintf("showtime:detail:%s", id)
}

func redisShowtimesList() string {
	return "showtimes:list"
}

func redisMovieShowtimes(movieId string) string {
	return fmt.Sprintf("movie:showtimes:%s", movieId)
}

func redisRoomShowtimes(roomId, date string) string {
	return fmt.Sprintf("room:showtimes:%s:%s", roomId, date)
}

func redisUpcomingShowtimes() string {
	return "showtimes:upcoming"
}

func redisShowtimesByIds(ids []string) string {
	return fmt.Sprintf("showtimes:ids:%v", ids)
}
