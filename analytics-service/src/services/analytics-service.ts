import bookingGrpcClient from '../grpc/booking-client.js'
import movieGrpcClient from '../grpc/movie-client.js'
import redisClient from '../config/redis.js'
import {
    RevenueByMovie,
    RevenueByShowtime,
    AnalyticsFilters,
    RevenueByGenre,
} from '../types/index.js'

class AnalyticsService {
    async getRevenueByTime(filters: AnalyticsFilters): Promise<any[]> {
        const cacheKey = `analytics:revenue:time:${JSON.stringify(filters)}`

        const cached = await redisClient.get(cacheKey)
        if (cached) {
            return JSON.parse(cached)
        }

        const data = await bookingGrpcClient.getRevenueByTime(
            filters.start_date || '',
            filters.end_date || '',
            filters.limit || 100,
        )

        await redisClient.set(cacheKey, JSON.stringify(data), 300)
        return data
    }

    async getRevenueByMovie(filters: AnalyticsFilters): Promise<RevenueByMovie[]> {
        const cacheKey = `analytics:revenue:movie:${JSON.stringify(filters)}`

        const cached = await redisClient.get(cacheKey)
        if (cached) {
            return JSON.parse(cached)
        }

        const rawData = await bookingGrpcClient.getRevenueByShowtime(
            filters.start_date || '',
            filters.end_date || '',
            '',
            filters.limit || 1000,
        )

        const showtimeIds = [...new Set(rawData.map((item) => item.showtime_id))]
        const showtimes = await movieGrpcClient.getShowtimes(showtimeIds)

        const showtimeMap = new Map(showtimes.map((st) => [st.id, st]))

        const movieRevenueMap = new Map<string, RevenueByMovie>()

        for (const item of rawData) {
            const showtime = showtimeMap.get(item.showtime_id)
            if (!showtime) {
                continue
            }

            const movieId = showtime.movie_id
            const existing = movieRevenueMap.get(movieId)

            if (existing) {
                existing.total_revenue += item.total_revenue
                existing.total_bookings += item.total_bookings
                existing.total_tickets += item.total_tickets
            }

            if (!existing) {
                movieRevenueMap.set(movieId, {
                    movie_id: movieId,
                    movie_title: showtime.movie_title,
                    total_revenue: item.total_revenue,
                    total_bookings: item.total_bookings,
                    total_tickets: item.total_tickets,
                })
            }
        }

        const result = Array.from(movieRevenueMap.values())
            .sort((a, b) => b.total_revenue - a.total_revenue)
            .slice(0, filters.limit || 50)

        await redisClient.set(cacheKey, JSON.stringify(result), 300)
        return result
    }

    async getRevenueByShowtime(filters: AnalyticsFilters): Promise<RevenueByShowtime[]> {
        const cacheKey = `analytics:revenue:showtime:${JSON.stringify(filters)}`

        const cached = await redisClient.get(cacheKey)
        if (cached) {
            return JSON.parse(cached)
        }

        const rawData = await bookingGrpcClient.getRevenueByShowtime(
            filters.start_date || '',
            filters.end_date || '',
            filters.showtime_id || '',
            filters.limit || 50,
        )

        const showtimeIds = rawData.map((item) => item.showtime_id)
        const showtimes = await movieGrpcClient.getShowtimes(showtimeIds)

        const showtimeMap = new Map(showtimes.map((st) => [st.id, st]))

        let filteredData = rawData
        if (filters.movie_id) {
            filteredData = rawData.filter((item) => {
                const showtime = showtimeMap.get(item.showtime_id)
                return showtime && showtime.movie_id === filters.movie_id
            })
        }

        const result = filteredData.map((item) => {
            const showtime = showtimeMap.get(item.showtime_id)

            if (!showtime) {
                return {
                    showtime_id: item.showtime_id,
                    movie_title: '',
                    showtime_date: '',
                    showtime_time: '',
                    room_number: '',
                    total_revenue: item.total_revenue,
                    total_bookings: item.total_bookings,
                    total_tickets: item.total_tickets,
                    occupancy_rate: 0,
                }
            }

            const totalSeats = showtime.seat_numbers.length
            const occupancyRate = totalSeats > 0 ? (item.total_tickets / totalSeats) * 100 : 0

            return {
                showtime_id: item.showtime_id,
                movie_title: showtime.movie_title,
                showtime_date: showtime.showtime_date,
                showtime_time: showtime.showtime_time,
                room_number: showtime.room_number,
                total_revenue: item.total_revenue,
                total_bookings: item.total_bookings,
                total_tickets: item.total_tickets,
                occupancy_rate: Math.round(occupancyRate * 100) / 100,
            }
        })

        await redisClient.set(cacheKey, JSON.stringify(result), 300)
        return result
    }

    async getRevenueByGenre(filters: AnalyticsFilters): Promise<RevenueByGenre[]> {
        const cacheKey = `analytics:revenue:genre:${JSON.stringify(filters)}`

        const cached = await redisClient.get(cacheKey)
        if (cached) {
            return JSON.parse(cached)
        }

        const rawData = await bookingGrpcClient.getRevenueByShowtime(
            filters.start_date || '',
            filters.end_date || '',
            '',
            1000,
        )

        const showtimeIds = [...new Set(rawData.map((item) => item.showtime_id))]
        const showtimes = await movieGrpcClient.getShowtimes(showtimeIds)

        const genreRevenueMap = new Map<string, RevenueByGenre>()
        const movieGenreMap = new Map<string, string>()

        for (const showtime of showtimes) {
            if (!movieGenreMap.has(showtime.movie_id)) {
                movieGenreMap.set(showtime.movie_id, 'Unknown')
            }
        }

        for (const item of rawData) {
            const showtime = showtimes.find((st) => st.id === item.showtime_id)
            if (!showtime) {
                continue
            }

            const genre = movieGenreMap.get(showtime.movie_id) || 'Unknown'
            const existing = genreRevenueMap.get(genre)

            if (existing) {
                existing.total_revenue += item.total_revenue
                existing.total_bookings += item.total_bookings
                existing.total_tickets += item.total_tickets
                const movies = new Set([...Array(existing.movie_count), showtime.movie_id])
                existing.movie_count = movies.size
            }

            if (!existing) {
                genreRevenueMap.set(genre, {
                    genre,
                    total_revenue: item.total_revenue,
                    total_bookings: item.total_bookings,
                    total_tickets: item.total_tickets,
                    movie_count: 1,
                })
            }
        }

        const result = Array.from(genreRevenueMap.values()).sort(
            (a, b) => b.total_revenue - a.total_revenue,
        )

        await redisClient.set(cacheKey, JSON.stringify(result), 300)
        return result
    }

    async getTotalRevenueSummary(filters: AnalyticsFilters): Promise<{
        total_revenue: number
        period_start: string | undefined
        period_end: string | undefined
    }> {
        const total = await bookingGrpcClient.getTotalRevenue(
            filters.start_date || '',
            filters.end_date || '',
        )

        return {
            total_revenue: total,
            period_start: filters.start_date,
            period_end: filters.end_date,
        }
    }
}

export default new AnalyticsService()
