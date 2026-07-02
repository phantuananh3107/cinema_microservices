import { RedisClientType } from 'redis'
import { logger } from '../../utils/logger'

export interface ICache {
    get<T>(key: string): Promise<T | null>
    set(key: string, value: any, ttlMs: number): Promise<void>
    delete(key: string): Promise<void>
}

export class RedisCache implements ICache {
    constructor(private client: RedisClientType) {}

    async get<T>(key: string): Promise<T | null> {
        try {
            const value = await this.client.get(key)
            if (!value) {
                return null
            }
            return JSON.parse(value) as T
        } catch (error) {
            logger.error('Error getting from cache', { key, error })
            throw error
        }
    }

    async set(key: string, value: any, ttlMs: number): Promise<void> {
        try {
            const serialized = JSON.stringify(value)
            if (ttlMs > 0) {
                await this.client.set(key, serialized, { PX: ttlMs })
            } else {
                await this.client.set(key, serialized)
            }
        } catch (error) {
            logger.error('Error setting cache', { key, error })
        }
    }

    async delete(key: string): Promise<void> {
        try {
            await this.client.del(key)
        } catch (error) {
            logger.error('Error deleting from cache', { key, error })
            throw error
        }
    }

    async deletePattern(pattern: string): Promise<void> {
        try {
            const keys: string[] = []
            for await (const keyBatch of this.client.scanIterator({
                MATCH: pattern,
                COUNT: 100,
            })) {
                if (Array.isArray(keyBatch)) {
                    keys.push(...keyBatch)
                } else {
                    keys.push(keyBatch as string)
                }
            }

            if (keys.length > 0) {
                await Promise.all(keys.map((key) => this.client.del(key)))
                logger.info(`Deleted ${keys.length} keys matching pattern: ${pattern}`)
            }
        } catch (error) {
            logger.error('Error deleting pattern from cache', { pattern, error })
            throw error
        }
    }
}

export class CacheManager {
    constructor(
        private cache: ICache,
        private roCache: ICache | null = null,
    ) {}

    async get<T>(key: string): Promise<T | null> {
        if (this.roCache) {
            return this.roCache.get<T>(key)
        }
        return this.cache.get<T>(key)
    }

    async set(key: string, value: any, ttlMs: number): Promise<void> {
        await this.cache.set(key, value, ttlMs)
    }

    async delete(key: string): Promise<void> {
        await this.cache.delete(key)
    }

    async getWithCache<T>(key: string, ttlMs: number, callback: () => Promise<T>): Promise<T> {
        const cached = await this.get<T>(key)
        if (cached !== null) {
            return cached
        }

        const value = await callback()

        this.set(key, value, ttlMs).catch((err) => {
            logger.error('Error caching value', { key, error: err })
        })

        return value
    }

    async invalidatePattern(pattern: string): Promise<void> {
        if (this.cache instanceof RedisCache) {
            await this.cache.deletePattern(pattern)
        }
    }

    async invalidateMultiple(keys: string[]): Promise<void> {
        for (const key of keys) {
            await this.delete(key).catch((err) => {
                logger.error(`Failed to invalidate key ${key}`, err)
            })
        }
    }
}
