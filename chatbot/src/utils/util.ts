import fs from 'fs/promises'
import { KeyManager } from '../pkg/keyManager/index.js'
import { logger } from './logger.js'

export async function createDirIfNotExists(dir: string): Promise<void> {
    try {
        await fs.access(dir)
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            await fs.mkdir(dir, { recursive: true, mode: 0o755 })
        } else {
            throw error
        }
    }
}

export async function retryWithApiKey<T>(
    keyManager: KeyManager,
    operation: (apiKey: string) => Promise<T>,
    maxRetries: number = 5,
): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const apiKey = keyManager.getNextKey()
        if (!apiKey) {
            throw new Error('No API key available')
        }

        try {
            return await operation(apiKey)
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error))
            logger.warn(`API attempt ${attempt} failed`, { error: lastError.message })

            if (attempt === maxRetries) {
                break
            }
        }
    }

    throw new Error(`API error after ${maxRetries} retries: ${lastError?.message}`)
}
