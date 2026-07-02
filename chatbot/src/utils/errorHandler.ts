export class DatabaseError extends Error {
    constructor(
        message: string,
        public readonly originalError?: unknown,
    ) {
        super(message)
        this.name = 'DatabaseError'
        Error.captureStackTrace(this, DatabaseError)
    }
}

export function wrapDatabaseError(action: string, error: unknown): DatabaseError {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new DatabaseError(`${action}: ${message}`, error)
}

export function isFileNotFoundError(error: unknown): error is NodeJS.ErrnoException {
    return error instanceof Error && 'code' in error && (error as any).code === 'ENOENT'
}
