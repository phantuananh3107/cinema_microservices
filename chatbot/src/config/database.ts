import { Pool, PoolConfig } from 'pg'

export interface IDatabaseManager {
    getPool(): Pool
    testConnection(): Promise<boolean>
    close(): Promise<void>
}

class DatabaseManager implements IDatabaseManager {
    private static instance: DatabaseManager | null = null
    private readonly pool: Pool

    private constructor() {
        const poolConfig: PoolConfig = {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME || 'cinema_app',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'postgres',
            max: 100,
            idleTimeoutMillis: 30000,
        }

        console.log(
            `Connecting to PostgreSQL at ${poolConfig.host}:${poolConfig.port}/${poolConfig.database}`,
        )

        this.pool = new Pool(poolConfig)

        this.pool.on('error', (err) => {
            console.error('Unexpected error on idle PostgreSQL client', err)
        })

        this.pool.on('connect', () => {
            console.log('PostgreSQL client connected')
        })
    }

    public static getInstance(): DatabaseManager {
        if (!DatabaseManager.instance) {
            DatabaseManager.instance = new DatabaseManager()
        }
        return DatabaseManager.instance
    }

    public getPool(): Pool {
        return this.pool
    }

    public async testConnection(): Promise<boolean> {
        try {
            const client = await this.pool.connect()
            await client.query('SELECT NOW()')
            client.release()
            console.log('Database connection test successful')
            return true
        } catch (error) {
            console.error('Unable to connect to the database:', error)
            return false
        }
    }

    public async close(): Promise<void> {
        await this.pool.end()
        console.log('Database connection pool closed')
    }

    public static getPool(): Pool {
        return DatabaseManager.getInstance().pool
    }
}

export default DatabaseManager
