import { Router, Request, Response } from 'express'
import analyticsService from '../services/analytics-service.js'
import { AnalyticsFilters } from '../types/index.js'

const router = Router()

export const parseFilters = (query: any): AnalyticsFilters => {
    return {
        start_date: query.start_date,
        end_date: query.end_date,
        movie_id: query.movie_id,
        showtime_id: query.showtime_id,
        genre: query.genre,
        status: query.status,
        booking_type: query.booking_type,
        limit: query.limit ? parseInt(query.limit) : undefined,
        offset: query.offset ? parseInt(query.offset) : undefined,
    }
}

router.get('/revenue/time', async (req: Request, res: Response) => {
    try {
        const filters = parseFilters(req.query)
        const data = await analyticsService.getRevenueByTime(filters)

        res.json({
            success: true,
            data,
        })
    } catch (error) {
        console.error('Error fetching revenue by time:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to fetch revenue by time',
        })
    }
})

router.get('/revenue/by-movie', async (req: Request, res: Response) => {
    try {
        const filters = parseFilters(req.query)
        const data = await analyticsService.getRevenueByMovie(filters)

        res.json({
            success: true,
            data,
        })
    } catch (error) {
        console.error('Error fetching revenue by movie:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to fetch revenue by movie',
        })
    }
})

router.get('/revenue/by-showtime', async (req: Request, res: Response) => {
    try {
        const filters = parseFilters(req.query)
        const data = await analyticsService.getRevenueByShowtime(filters)

        res.json({
            success: true,
            data,
        })
    } catch (error) {
        console.error('Error fetching revenue by showtime:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to fetch revenue by showtime',
        })
    }
})

router.get('/revenue/by-genre', async (req: Request, res: Response) => {
    try {
        const filters = parseFilters(req.query)
        const data = await analyticsService.getRevenueByGenre(filters)

        res.json({
            success: true,
            data,
        })
    } catch (error) {
        console.error('Error fetching revenue by genre:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to fetch revenue by genre',
        })
    }
})

router.get('/revenue/total', async (req: Request, res: Response) => {
    try {
        const filters = parseFilters(req.query)
        const data = await analyticsService.getTotalRevenueSummary(filters)

        res.json({
            success: true,
            data,
        })
    } catch (error) {
        console.error('Error fetching total revenue:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to fetch total revenue',
        })
    }
})

export default router
