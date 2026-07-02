import winston from 'winston'

const { combine, timestamp, printf, colorize, errors } = winston.format

const serializeError = (error: any): any => {
    if (error instanceof Error) {
        return {
            message: error.message,
            stack: error.stack,
            name: error.name,
            ...(error as any),
        }
    }
    return error
}

const logFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`

    const serializedMetadata: any = {}
    for (const [key, value] of Object.entries(metadata)) {
        serializedMetadata[key] = serializeError(value)
    }

    if (Object.keys(serializedMetadata).length > 0) {
        msg += ` ${JSON.stringify(serializedMetadata, null, 2)}`
    }

    if (stack) {
        msg += `\n${stack}`
    }

    return msg
})

export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat,
    ),
    transports: [
        new winston.transports.Console({
            format: combine(colorize(), logFormat),
        }),
    ],
})
