import { createClient, RedisClientType } from 'redis'

class RedisClient {
    private client: RedisClientType | null = null

    async connect(): Promise<RedisClientType> {
        if (this.client) {
            return this.client
        }

        this.client = createClient({
            socket: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
            },
            database: parseInt(process.env.REDIS_DB || '0'),
        })

        this.client.on('error', (err) => {
            console.error('Redis Client Error:', err)
        })

        await this.client.connect()
        return this.client
    }

    async disconnect(): Promise<void> {
        if (!this.client) {
            return
        }

        await this.client.quit()
        this.client = null
    }

    getClient(): RedisClientType {
        if (!this.client) {
            throw new Error('Redis client not connected')
        }

        return this.client
    }

    async get(key: string): Promise<string | null> {
        const client = this.getClient()
        return await client.get(key)
    }

    async set(key: string, value: string, ttl?: number): Promise<void> {
        const client = this.getClient()

        if (ttl) {
            await client.setEx(key, ttl, value)
            return
        }

        await client.set(key, value)
    }

    async del(key: string): Promise<void> {
        const client = this.getClient()
        await client.del(key)
    }
}

export default new RedisClient()
