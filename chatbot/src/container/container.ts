import { asClass, asFunction, createContainer, InjectionMode } from 'awilix'
import { Pool } from 'pg'
import DatabaseManager from '../config/database'
import { RedisManager } from '../config/redis'
import { KeyManager } from '../pkg/keyManager'
import { RedisCache, CacheManager } from '../pkg/caching'
import { EmbeddingService, DocumentService, ChatService } from '../services'
import { ChatHandler, DocumentHandler } from '../handlers'

export interface AppContainer {
    pool: Pool
    keyManager: KeyManager
    cacheManager: CacheManager
    embeddingService: EmbeddingService
    documentService: DocumentService
    chatService: ChatService
    chatHandler: ChatHandler
    documentHandler: DocumentHandler
}

export async function createAppContainer(): Promise<AppContainer> {
    const container = createContainer<AppContainer>({
        injectionMode: InjectionMode.PROXY,
    })

    const databaseManager = DatabaseManager.getInstance()
    const dbConnected = await databaseManager.testConnection()
    if (!dbConnected) {
        throw new Error('Failed to connect to PostgreSQL database')
    }

    const pool = databaseManager.getPool()

    const redisManager = RedisManager.getInstance()
    const redisConnected = await redisManager.connect()
    if (!redisConnected) {
        throw new Error('Failed to connect to Redis')
    }

    const isReady = await redisManager.isConnected()
    if (!isReady) {
        throw new Error('Redis connection test failed')
    }

    console.log('All database connections established successfully')

    const redisClient = redisManager.getClient()
    const redisCache = new RedisCache(redisClient)
    const cacheManager = new CacheManager(redisCache)

    container.register({
        pool: asFunction(() => pool).singleton(),

        keyManager: asFunction(() => {
            const geminiKeys = process.env.GEMINI_API_KEY
            if (!geminiKeys) {
                throw new Error('GEMINI_API_KEY environment variable is not set')
            }

            const keyManager = new KeyManager(geminiKeys)
            if (!keyManager.hasKeys()) {
                throw new Error('No valid Gemini API keys provided')
            }

            console.log(`Loaded ${keyManager.getKeyCount()} Gemini API key(s)`)
            return keyManager
        }).singleton(),

        cacheManager: asFunction(() => cacheManager).singleton(),

        embeddingService: asClass(EmbeddingService).singleton(),

        documentService: asClass(DocumentService).singleton(),

        chatService: asClass(ChatService).singleton(),

        chatHandler: asClass(ChatHandler).singleton(),

        documentHandler: asClass(DocumentHandler).singleton(),
    })

    console.log('Dependency injection container initialized')

    return container.cradle
}
