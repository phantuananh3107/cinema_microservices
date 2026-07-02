import express, { Express } from 'express'
import fileUpload from 'express-fileupload'
import cors from 'cors'
import dotenv from 'dotenv'
import { createAppContainer } from './container/container'
import { corsMiddleware } from './middleware'
import { logger } from './utils'

dotenv.config()

const PORT = process.env.PORT || 8089

async function startServer() {
    try {
        const container = await createAppContainer()

        const app: Express = express()

        app.use(express.json())
        app.use(express.urlencoded({ extended: true }))
        app.use(cors())
        app.use(corsMiddleware)
        app.use(
            fileUpload({
                limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
                abortOnLimit: true,
            }),
        )

        const { chatHandler, documentHandler } = container

        app.post('/api/v1/chatbot/message', (req, res) => chatHandler.sendMessage(req, res))
        app.post('/api/v1/chatbot/document/upload', (req, res) =>
            documentHandler.uploadDocument(req, res),
        )
        app.get('/api/v1/chatbot/document/list', (req, res) =>
            documentHandler.listDocuments(req, res),
        )
        app.get('/api/v1/chatbot/document/:id', (req, res) => documentHandler.getDocument(req, res))
        app.delete('/api/v1/chatbot/document/:id', (req, res) =>
            documentHandler.deleteDocument(req, res),
        )
        app.get('/api/v1/chatbot/document/:id/chunks', (req, res) =>
            documentHandler.getDocumentChunks(req, res),
        )

        app.post('/document/upload', (req, res) => documentHandler.uploadDocument(req, res))
        app.get('/document/list', (req, res) => documentHandler.listDocuments(req, res))
        app.get('/document/:id', (req, res) => documentHandler.getDocument(req, res))
        app.delete('/document/:id', (req, res) => documentHandler.deleteDocument(req, res))
        app.get('/document/:id/chunks', (req, res) => documentHandler.getDocumentChunks(req, res))

        app.get('/health', (_req, res) => {
            res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
        })

        app.listen(PORT, () => {
            logger.info(`Server is running on port ${PORT}`)
            logger.info(`Health check: http://localhost:${PORT}/health`)
            logger.info(`Chat endpoint: http://localhost:${PORT}/chat/ask`)
            logger.info(`Document upload: http://localhost:${PORT}/document/upload`)
        })
    } catch (error) {
        logger.error('Failed to start server', { error })
        process.exit(1)
    }
}

startServer()
