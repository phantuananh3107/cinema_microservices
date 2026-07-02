import express from 'express'
import dotenv from 'dotenv'
import database from './config/database'
import redisClient from './config/redis'
import analyticsRoutes from './routes/analytics-routes'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 8087

app.use(express.json())

app.get('/health', (_req, res) => {
    res.json({
        success: true,
        message: 'Analytics service is running',
        timestamp: new Date().toISOString(),
    })
})

app.use('/api/v1/analytics', analyticsRoutes)

const startServer = async () => {
    try {
        database.connect()
        console.log('Connected to PostgreSQL')

        await redisClient.connect()
        console.log('Connected to Redis')

        app.listen(PORT, () => {
            console.log(`Analytics service is running on port ${PORT}`)
        })
    } catch (error) {
        console.error('Failed to start server:', error)
        process.exit(1)
    }
}

const shutdown = async () => {
    console.log('Shutting down gracefully...')

    try {
        await database.disconnect()
        await redisClient.disconnect()
        console.log('Disconnected from databases')
        process.exit(0)
    } catch (error) {
        console.error('Error during shutdown:', error)
        process.exit(1)
    }
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

startServer()
