export interface GeminiPart {
    text: string
}

export interface GeminiContent {
    parts: GeminiPart[]
    role?: string
}

export interface GeminiGenerationConfig {
    maxOutputTokens: number
    temperature: number
}

export interface GeminiSafetySetting {
    category: string
    threshold: string
}

export interface GeminiRequest {
    contents: GeminiContent[]
    generationConfig: GeminiGenerationConfig
    safetySettings?: GeminiSafetySetting[]
}

export interface GeminiCandidate {
    content: GeminiContent
}

export interface GeminiResponse {
    candidates: GeminiCandidate[]
}

export interface GeminiEmbeddingPart {
    text: string
}

export interface GeminiEmbeddingContent {
    parts: GeminiEmbeddingPart[]
}

export interface GeminiEmbeddingRequest {
    model: string
    content: GeminiEmbeddingContent
}

export interface GeminiEmbeddingValues {
    values: number[]
}

export interface GeminiEmbeddingResponse {
    embedding: GeminiEmbeddingValues
}
