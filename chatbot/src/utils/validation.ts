import he from 'he'

export const MaxQuestionLength = 1000
export const MaxTitleLength = 200
export const MinQuestionLength = 3

export class ValidationError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'ValidationError'
    }
}

const suspiciousPatterns = [
    /<script[^>]*>.*?<\/script>/i,
    /javascript:/i,
    /data:text\/html/i,
    /vbscript:/i,
    /onload\s*=/i,
    /onerror\s*=/i,
    /onclick\s*=/i,
    /<iframe[^>]*>/i,
    /<object[^>]*>/i,
    /<embed[^>]*>/i,
    /<link[^>]*>/i,
    /<meta[^>]*>/i,
    /eval\s*\(/i,
    /document\./i,
    /window\./i,
]

const sqlInjectionPatterns = [
    /(union\s+select|select\s+.*\s+from|insert\s+into|delete\s+from|update\s+.*\s+set)/i,
    /(drop\s+table|drop\s+database|truncate\s+table)/i,
    /(exec\s*\(|execute\s*\(|sp_executesql)/i,
    /(;|\s+or\s+1\s*=\s*1|'\s*or\s*'1'\s*=\s*'1)/i,
]

const commandInjectionPatterns = [
    /(&&|\|\||;|\||`)/i,
    /(rm\s+-rf|del\s+\/|format\s+c:)/i,
    /(wget\s+|curl\s+|nc\s+|netcat\s+)/i,
    /(\$\(|\$\{|`.*`)/i,
]

const promptInjectionPatterns = [
    /(bỏ\s+qua|ignore).*?(hướng\s+dẫn|instructions?|previous|above)/i,
    /(disregard|forget).*?(instructions?|above|previous|system)/i,
    /(trả\s+về|return).*?(toàn\s+bộ|all).*?(hướng\s+dẫn|prompt|instructions?)/i,
    /(đặc\s+biệt|special|important).*?(bỏ\s+qua|ignore|skip)/i,
    /system\s+(prompt|instructions?|role)/i,
    /reveal.*?(prompt|instructions?|system)/i,
    /show.*?(prompt|instructions?|system)/i,
    /tell\s+me.*?(prompt|instructions?|system)/i,
    /(override|bypass|circumvent).*?(security|safety|instructions?)/i,
    /act\s+as.*?(different|another|new)\s+(role|character|assistant)/i,
    /pretend.*?(you\s+are|to\s+be).*?(different|another|new)/i,
    /you\s+are\s+now.*?(jailbreak|unrestricted|without\s+limits)/i,
    /(simulation|roleplay|game)\s+mode/i,
    /developer\s+(mode|override|access)/i,
    /---+\s*(end|stop|break|terminate)/i,
    /(end\s+of\s+prompt|prompt\s+ends?\s+here)/i,
    /đặc\s+biệt.*?skip.*?hướng\s+dẫn/i,
    /(làm\s+theo|follow).*?(yêu\s+cầu|request).*?(tối\s+cao|supreme|highest)/i,
    /(bạn\s+phải|you\s+must).*?(nói\s+là|say).*?tôi\s+là\s+ai/i,
    /skip.*?(hướng\s+dẫn|instructions?|above|previous)/i,
    /(tối\s+cao|supreme|highest).*?(yêu\s+cầu|request|command)/i,
    /không\s+nói.*?bất\s+kỳ.*?câu.*?khác/i,
]

export function validateQuestion(question: string): string {
    if (!question) {
        throw new ValidationError('Input is empty')
    }

    question = question.trim()

    if (question.length === 0) {
        throw new ValidationError('Input is empty')
    }

    if (question.length < MinQuestionLength) {
        throw new ValidationError('Input is too short')
    }

    if (question.length > MaxQuestionLength) {
        throw new ValidationError('Input exceeds maximum length')
    }

    checkSuspiciousContent(question)

    const sanitized = sanitizeInput(question)

    return sanitized
}

export function validateTitle(title: string): string {
    if (!title) {
        throw new ValidationError('Input is empty')
    }

    title = title.trim()

    if (title.length === 0) {
        throw new ValidationError('Input is empty')
    }

    if (title.length > MaxTitleLength) {
        throw new ValidationError('Input exceeds maximum length')
    }

    checkBasicSuspiciousContent(title)

    const sanitized = sanitizeInput(title)

    return sanitized
}

function checkSuspiciousContent(input: string): void {
    for (const pattern of suspiciousPatterns) {
        if (pattern.test(input)) {
            throw new ValidationError('Input contains suspicious content')
        }
    }

    for (const pattern of sqlInjectionPatterns) {
        if (pattern.test(input)) {
            throw new ValidationError('Input contains suspicious content')
        }
    }

    for (const pattern of commandInjectionPatterns) {
        if (pattern.test(input)) {
            throw new ValidationError('Input contains suspicious content')
        }
    }

    for (const pattern of promptInjectionPatterns) {
        if (pattern.test(input)) {
            throw new ValidationError('Input contains suspicious content')
        }
    }
}

function checkBasicSuspiciousContent(input: string): void {
    const basicPatterns = [
        /<script[^>]*>.*?<\/script>/i,
        /javascript:/i,
        /onload\s*=/i,
        /onerror\s*=/i,
    ]

    for (const pattern of basicPatterns) {
        if (pattern.test(input)) {
            throw new ValidationError('Input contains suspicious content')
        }
    }
}

function sanitizeInput(input: string): string {
    let sanitized = he.encode(input)

    sanitized = removeControlCharacters(sanitized)

    sanitized = normalizeWhitespace(sanitized)

    return sanitized
}

function removeControlCharacters(input: string): string {
    return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
}

function normalizeWhitespace(input: string): string {
    const normalized = input.replace(/\s+/g, ' ')

    return normalized.trim()
}

export function validateAndSanitizeContext(context: string): string {
    if (context.length > 10000) {
        throw new ValidationError('Input exceeds maximum length')
    }

    let sanitized = he.encode(context)
    sanitized = removeControlCharacters(sanitized)

    return sanitized
}

export function isValidFileExtension(filename: string, allowedExtensions: string[]): boolean {
    if (!filename) {
        return false
    }

    const lastDot = filename.lastIndexOf('.')
    if (lastDot === -1 || lastDot === filename.length - 1) {
        return false
    }

    const ext = filename.substring(lastDot).toLowerCase()

    for (const allowed of allowedExtensions) {
        if (ext === allowed.toLowerCase()) {
            return true
        }
    }

    return false
}

export function sanitizeFilename(filename: string): string {
    const dangerous = ['/', '\\', '..', ':', '*', '?', '"', '<', '>', '|', '\x00']

    let sanitized = filename
    for (const char of dangerous) {
        sanitized = sanitized.replace(
            new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
            '_',
        )
    }

    if (sanitized.length > 255) {
        sanitized = sanitized.substring(0, 255)
    }

    sanitized = sanitized.replace(/^\./, '')
    sanitized = sanitized.replace(/^-/, '')

    if (!sanitized) {
        sanitized = 'unnamed_file'
    }

    return sanitized
}
