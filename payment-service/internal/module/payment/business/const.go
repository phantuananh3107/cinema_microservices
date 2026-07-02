package business

import (
	"time"
)

const (
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
