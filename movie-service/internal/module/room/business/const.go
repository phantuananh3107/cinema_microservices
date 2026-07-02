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

func redisRoomDetail(id string) string {
	return fmt.Sprintf("room:detail:%s", id)
}

func redisRoomsList() string {
	return "rooms:list"
}

func redisRoomsSearch(search string) string {
	return fmt.Sprintf("rooms:search:%s", search)
}
