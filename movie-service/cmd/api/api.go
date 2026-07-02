package main

import (
	"movie-service/internal/container"
	"movie-service/internal/module/movie/transport/rest"
	newsRest "movie-service/internal/module/news/transport/rest"
	roomRest "movie-service/internal/module/room/transport/rest"
	seatRest "movie-service/internal/module/seat/transport/rest"
	showtimeRest "movie-service/internal/module/showtime/transport/rest"
	"movie-service/middleware"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"github.com/urfave/cli/v2"
)

func ServeAPI() *cli.Command {
	return &cli.Command{
		Name:  "serve",
		Usage: "start movie service api",
		Action: func(c *cli.Context) error {
			router := gin.Default()
			router.Use(middleware.Cors())
			// router.Use(middleware.AuthMiddleware())

			v1 := router.Group("/api/v1")
			startRouteV1(v1)

			logrus.Info("Movie service api is running on port 8083")
			return router.Run(":8083")
		},
	}
}

func startRouteV1(group *gin.RouterGroup) {
	i := container.NewContainer()

	movieApi, err := rest.NewAPI(i)
	if err != nil {
		panic(err)
	}

	roomApi, err := roomRest.NewAPI(i)
	if err != nil {
		panic(err)
	}

	seatApi, err := seatRest.NewAPI(i)
	if err != nil {
		panic(err)
	}

	showtimeApi, err := showtimeRest.NewAPI(i)
	if err != nil {
		panic(err)
	}

	newsApi, err := newsRest.NewAPI(i)
	if err != nil {
		panic(err)
	}

	// Movie endpoints
	movies := group.Group("/movies")
	{
		movies.GET("", movieApi.GetMovies)
		movies.POST("", movieApi.CreateMovie)
		movies.GET("/stats", movieApi.GetMovieStats)
		movies.GET("/genres", movieApi.GetGenres)
		movies.GET("/:id", movieApi.GetMovieById)
		movies.PUT("/:id", movieApi.UpdateMovie)
		movies.DELETE("/:id", movieApi.DeleteMovie)
		movies.PATCH("/:id/status", movieApi.UpdateMovieStatus)
	}

	// Room endpoints
	rooms := group.Group("/rooms")
	{
		rooms.GET("", roomApi.GetRooms)
		rooms.POST("", roomApi.CreateRoom)
		rooms.GET("/:id", roomApi.GetRoomById)
		rooms.PUT("/:id", roomApi.UpdateRoom)
		rooms.DELETE("/:id", roomApi.DeleteRoom)
		rooms.PATCH("/:id/status", roomApi.UpdateRoomStatus)
	}

	// Seat endpoints
	seats := group.Group("/seats")
	{
		seats.GET("", seatApi.GetSeats)
		seats.POST("", seatApi.CreateSeat)
		seats.GET("/locked", seatApi.GetLockedSeats)
		seats.GET("/:id", seatApi.GetSeatById)
		seats.PUT("/:id", seatApi.UpdateSeat)
		seats.DELETE("/:id", seatApi.DeleteSeat)
		seats.PATCH("/:id/status", seatApi.UpdateSeatStatus)
	}

	// Showtime endpoints
	showtimes := group.Group("/showtimes")
	{
		showtimes.GET("", showtimeApi.GetShowtimes)
		showtimes.POST("", showtimeApi.CreateShowtime)
		showtimes.GET("/upcoming", showtimeApi.GetUpcomingShowtimes)
		showtimes.GET("/:id", showtimeApi.GetShowtimeById)
		showtimes.PUT("/:id", showtimeApi.UpdateShowtime)
		showtimes.DELETE("/:id", showtimeApi.DeleteShowtime)
		showtimes.PATCH("/:id/status", showtimeApi.UpdateShowtimeStatus)
	}

	// News endpoints
	news := group.Group("/news")
	{
		news.GET("/summaries", newsApi.GetNewsSummaries)
		news.GET("/summaries/:id", newsApi.GetNewsSummaryByID)

		// Admin news endpoints
		// TODO: Add middleware for admin/manager_staff authentication
		newsAdmin := news.Group("/admin")
		{
			newsAdmin.GET("/summaries", newsApi.GetAllNewsSummaries)
			newsAdmin.PUT("/summaries/:id", newsApi.UpdateNewsSummary)
			newsAdmin.PUT("/summaries/:id/active", newsApi.ToggleNewsSummaryActive)
		}
	}
}
