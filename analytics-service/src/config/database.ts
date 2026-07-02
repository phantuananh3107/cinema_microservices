import { Pool } from 'pg'

class Database {
    private pool: Pool | null = null

    connect(): Pool {
        if (this.pool) {
            return this.pool
        }

        this.pool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME || 'cinema_db',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'postgres',
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        })

        return this.pool
    }

    async disconnect(): Promise<void> {
        if (!this.pool) {
            return
        }

        await this.pool.end()
        this.pool = null
    }

    getPool(): Pool {
        if (!this.pool) {
            return this.connect()
        }

        return this.pool
    }
}

export default new Database()
